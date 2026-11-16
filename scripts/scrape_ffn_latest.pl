#!/usr/bin/env perl
# scrape_ffn_latest.pl -- grab a writer's most recent FanFiction.net story,
# all chapters, into a folder. Companion to scrape_ao3_latest.pl.
#
#   perl scripts/scrape_ffn_latest.pl <user-id | profile-url | story-url>
#       [--out DIR] [--delay SECONDS] [--cookie-file FILE]
#
# Examples:
#   perl scripts/scrape_ffn_latest.pl 2805979
#   perl scripts/scrape_ffn_latest.pl https://www.fanfiction.net/u/2805979/His-Excellency-TeenageAngst
#   perl scripts/scrape_ffn_latest.pl https://www.fanfiction.net/s/11266316/1/Posterity
#   perl scripts/scrape_ffn_latest.pl 2805979 --cookie-file cookies.txt --delay 6
#
# What it does:
#   1. Resolves the author to a numeric FFN user id (see USERNAME note below).
#   2. Fetches https://www.fanfiction.net/u/<id>/<name> and takes the FIRST
#      story in the author's OWN list ("My Stories"). The profile page
#      lists favourited stories by OTHER authors first, so the script
#      skips those: a favourite entry has " by <author>" right after its
#      title link, an own story does not. "First" means most recently
#      updated, which is the page's default sort order; same caveat as
#      the AO3 script, an old story updated recently outranks a new one.
#   3. Fetches every chapter at /s/<story_id>/<n>/<slug> (the chapter
#      count comes from the story's metadata line) and writes one text
#      file per chapter into out/<author>/<story_id>-<slug>/
#        00_meta.txt        title, author, url, words, chapters, dates, summary
#        01_chapter-01-<slug>.txt
#        02_chapter-02-<slug>.txt
#        ...
#        full.txt           all chapters concatenated
#
# USERNAME NOTE: FanFiction.net identifies authors by NUMERIC id, not by
# username. The profile URL is /u/<id>/<name>; a bare username is not a
# URL on FFN at all (https://www.fanfiction.net/u/<username> is a 404,
# verified 2026-11-14). So this script does NOT take a bare username.
# Give it the id (the number after /u/ in the profile URL), the full
# profile URL, or any story URL by that author, and it works out the id.
# Example: His Excellency TeenageAngst is id 2805979.
#
# CLOUDFLARE NOTE: FFN blocks plain curl from servers with a 403
# "Just a moment..." challenge page. That is not a bug in this script,
# it is FFN's bot protection, and it fires on www and m alike. To get
# past it you need cookies from a real browser session:
#   1. Open fanfiction.net in your own browser and pass the human check.
#   2. Export that site's cookies with an extension such as
#      "Get cookies.txt LOCALLY" (Netscape format) to cookies.txt.
#   3. Run this script with --cookie-file cookies.txt.
# Without that, the script detects the 403 challenge page and stops
# with a clear message instead of writing garbage. Re-running from a
# home IP instead of a datacenter may also pass without cookies.
#
# Dependencies: core Perl only (strict, warnings, Getopt::Long, File::Path,
# File::Spec) plus curl on PATH. No CPAN modules on purpose, same as the
# AO3 companion: this box has Perl 5.38 with no Mojo, no LWP, no HTML::*
# installed.
#
# Politeness: 4 second delay between requests by default. FFN rate
# limits hard, so do not set this to 0 for a many-chapter story.
#
# Offline test flags (for testing the parsers without hitting FFN):
#   --profile-file FILE   parse this saved profile HTML instead of fetching
#   --chapter-dir DIR     read chapter HTML from DIR/<n>.html instead of fetching
#   --story-file FILE     parse this saved story page instead of fetching
#                         (only used when the input is a story URL)
#
# Exit codes: 0 ok, 1 usage error, 2 fetch/parse failure (FFN blocked the
# request, author not found, no own stories, chapter page unparseable).

use strict;
use warnings;
use Getopt::Long qw(GetOptions);
use File::Path qw(make_path);
use File::Spec;

my $UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
       . '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
my $BASE = 'https://www.fanfiction.net';

my $out_dir     = 'out';
my $delay       = 4;
my $cookie_file;
my $profile_file;
my $chapter_dir;
my $story_file;
my $help;

GetOptions(
    'out=s'         => \$out_dir,
    'delay=i'       => \$delay,
    'cookie-file=s' => \$cookie_file,
    'profile-file=s' => \$profile_file,
    'chapter-dir=s'  => \$chapter_dir,
    'story-file=s'   => \$story_file,
    'help'           => \$help,
) or die "Usage: $0 <user-id | profile-url | story-url> [--out DIR] [--delay SECONDS] [--cookie-file FILE]\n";

if ($help) {
    print "Usage: $0 <user-id | profile-url | story-url> [--out DIR] [--delay SECONDS] [--cookie-file FILE]\n"
        . "  Grabs the author's most recent FFN story and downloads all\n"
        . "  chapters as text files into <out>/<author>/<story_id>-<slug>/\n"
        . "  FFN authors are identified by numeric id, not username: the id\n"
        . "  is the number after /u/ in the profile URL.\n";
    exit 0;
}

my $input = shift @ARGV or do {
    print STDERR "Usage: $0 <user-id | profile-url | story-url> [--out DIR] [--delay SECONDS] [--cookie-file FILE]\n";
    exit 1;
};
$input =~ s/^\s+|\s+$//g;
$delay = 0 if $delay < 0;
if (defined $cookie_file && !-e $cookie_file) {
    print STDERR "Cookie file '$cookie_file' does not exist.\n";
    exit 1;
}

# --- fetch: curl to a temp file, return (http_code, html, error) -------------
sub fetch_url {
    my ($url) = @_;
    my $tmp = File::Spec->tmpdir() . "/ffn_fetch_$$.html";
    my @cmd = ('curl', '-s', '-L', '--max-time', '60',
               '-A', $UA,
               (defined $cookie_file ? ('-b', $cookie_file) : ()),
               '-o', $tmp, '-w', '%{http_code}', $url);
    # List-form open: no shell involved, so parentheses and spaces in the
    # user-agent string cannot break quoting.
    open my $pipe, '-|', @cmd or return (0, '', "cannot run curl: $!");
    my $code = <$pipe>;
    close $pipe;
    chomp $code if defined $code;
    my $curl_status = $? >> 8;
    if ($curl_status != 0 || !defined $code || $code !~ /\A\d+\z/) {
        unlink $tmp if -e $tmp;
        return (0, '', "curl failed (exit $curl_status) fetching $url -- no "
             . "HTTP response at all. FFN's Cloudflare protection drops "
             . "plain curl requests from servers outright; re-run with "
             . "--cookie-file and cookies exported from your own browser "
             . "after passing the human check.");
    }
    open my $fh, '<:encoding(UTF-8)', $tmp or return (0, '', "cannot read $tmp: $!");
    local $/;
    my $html = <$fh>;
    close $fh;
    unlink $tmp;
    return ($code + 0, defined $html ? $html : '', '');
}

sub read_file_or_die {
    my ($path) = @_;
    open my $fh, '<:encoding(UTF-8)', $path or die "Cannot read $path: $!\n";
    local $/;
    my $text = <$fh>;
    close $fh;
    return defined $text ? $text : '';
}

# --- tiny HTML helpers (no HTML::* on this box) -----------------------------
sub decode_entities {
    my ($s) = @_;
    return '' unless defined $s;
    $s =~ s/&nbsp;/ /g;
    $s =~ s/&amp;/&/g;
    $s =~ s/&lt;/</g;
    $s =~ s/&gt;/>/g;
    $s =~ s/&quot;/"/g;
    $s =~ s/&#39;/'/g;
    $s =~ s/&apos;/'/g;
    $s =~ s/&#(\d+);/chr($1)/ge;
    $s =~ s/&#x([0-9a-fA-F]+);/chr(hex($1))/ge;
    return $s;
}

sub strip_tags {
    my ($s) = @_;
    return '' unless defined $s;
    $s =~ s/<br\s*\/?>/\n/gi;
    $s =~ s/<\/p>/\n\n/gi;
    $s =~ s/<\/div>/\n/gi;
    $s =~ s/<\/h[1-6]>/\n/gi;
    $s =~ s/<hr\s*\/?>/\n---\n/gi;
    $s =~ s/<[^>]+>/ /g;
    $s = decode_entities($s);
    $s =~ s/[ \t]+/ /g;
    $s =~ s/\n[ \t]+/\n/g;
    $s =~ s/\n{3,}/\n\n/g;
    $s =~ s/^\s+|\s+$//g;
    return $s;
}

sub slugify {
    my ($s) = @_;
    $s = lc $s;
    $s =~ s/[^a-z0-9]+/-/g;
    $s =~ s/^-+|-+$//g;
    $s = substr($s, 0, 60);
    $s =~ s/-+$//;
    return $s ne '' ? $s : 'untitled';
}

sub check_blocked {
    my ($code, $html) = @_;
    if ($code == 403 && $html =~ /Just a moment|cf-challenge|Cloudflare|Attention Required/i) {
        return 'FanFiction.net blocked the request with its Cloudflare '
             . '"Just a moment..." check (HTTP 403). Plain curl from a server '
             . 'gets flagged. Fix: open fanfiction.net in your own browser, '
             . 'pass the human check, export that site\'s cookies to a '
             . 'Netscape-format cookies.txt (extension "Get cookies.txt '
             . 'LOCALLY"), and re-run with --cookie-file cookies.txt.';
    }
    return "FFN returned HTTP $code" if $code == 403;
    return '';
}

# --- resolve input to a numeric user id ------------------------------------
my ($user_id, $story_id_from_url);
if ($input =~ /\A(\d+)\z/) {
    $user_id = $1;
}
elsif ($input =~ m{fanfiction\.net/u/(\d+)}i) {
    $user_id = $1;
}
elsif ($input =~ m{fanfiction\.net/s/(\d+)}i) {
    $story_id_from_url = $1;
}
else {
    print STDERR "Cannot use '$input' as an FFN author.\n"
               . "FFN identifies authors by NUMERIC id, not username:\n"
               . "  a bare username is not a URL on FFN\n"
               . "  (https://www.fanfiction.net/u/<username> is a 404).\n"
               . "Give one of these instead:\n"
               . "  * the numeric id, e.g. 2805979\n"
               . "  * the profile URL, e.g. https://www.fanfiction.net/u/2805979/His-Excellency-TeenageAngst\n"
               . "  * any story URL by that author, e.g. https://www.fanfiction.net/s/11266316/1/Posterity\n"
               . "The id is the number after /u/ in the author's profile URL.\n";
    exit 1;
}

# Story URL input: fetch chapter 1, read the author link off it.
if (defined $story_id_from_url) {
    print "Resolving author from story $story_id_from_url...\n";
    my $story_html;
    if (defined $story_file) {
        $story_html = read_file_or_die($story_file);
    }
    else {
        my ($code, $html, $err) = fetch_url("$BASE/s/$story_id_from_url/1/");
        if ($err ne '') { print STDERR "Fetch failed: $err\n"; exit 2; }
        if (my $blocked = check_blocked($code, $html)) {
            print STDERR "$blocked\n";
            exit 2;
        }
        if ($code != 200) {
            print STDERR "Story fetch failed: HTTP $code for story $story_id_from_url.\n";
            exit 2;
        }
        $story_html = $html;
        sleep $delay if $delay;
    }
    my ($aid) = $story_html =~ m{href=["']/u/(\d+)/}i;
    if (!$aid) {
        print STDERR "Could not find the author link (/u/<id>/) on story page $story_id_from_url.\n";
        exit 2;
    }
    $user_id = $aid;
}

# --- 1. profile page: first OWN story, skipping favourites ------------------
print "Fetching profile for user id $user_id...\n";
my $profile_html;
if (defined $profile_file) {
    $profile_html = read_file_or_die($profile_file);
}
else {
    my ($code, $html, $err) = fetch_url("$BASE/u/$user_id/");
    if ($err ne '') { print STDERR "Fetch failed: $err\n"; exit 2; }
    if (my $blocked = check_blocked($code, $html)) {
        print STDERR "$blocked\n";
        exit 2;
    }
    if ($code == 404) {
        print STDERR "No FFN author with id $user_id (HTTP 404).\n";
        exit 2;
    }
    if ($code != 200) {
        print STDERR "Profile fetch failed: HTTP $code for user id $user_id.\n";
        exit 2;
    }
    $profile_html = $html;
    sleep $delay if $delay;
}

# Display name off the page title ("Name | FanFiction").
my ($author_name) = $profile_html =~ m{<title>\s*(.*?)\s*\|\s*FanFiction}is;
$author_name = defined $author_name ? strip_tags($author_name) : "user-$user_id";
$author_name =~ s/\s+/_/g;

# Story entries: <a class="stitle" href="/s/<id>/<ch>/<slug>">Title</a>
# FFN mixes single and double quotes, so both are matched. The entry tail
# (next ~1500 chars) holds the summary and the metadata line. A favourite
# entry has " by <a href='/u/...'>Author</a>" right after its title link;
# an own story does not, so favourites are skipped on that test.
my @stories;
while ($profile_html =~ m{
    <a[^>]*class=["']stitle["'][^>]*href=["']/s/(\d+)/(\d+)/([^"']*)["'][^>]*>(.*?)</a>
}gsx) {
    my ($sid, $ch, $slug, $title_raw) = ($1, $2, $3, $4);
    my $pos  = pos($profile_html);
    my $tail = substr($profile_html, $pos, 1500);
    # Favourite test: " by " plus an author link at the start of the tail.
    my $head = substr($tail, 0, 200);
    next if $head =~ m{^\s*by\s+<a[^>]*href=["']/u/\d+}is;
    my $title = strip_tags($title_raw);
    my $tail_text = strip_tags($tail);
    # Metadata line looks like:
    # "Warcraft - Rated: M - English - Adventure - Chapters: 9 - Words: 35,319
    #  - Updated: 1/15/2022 - Published: 12/6/2020 - Human, OC"
    my ($chapters) = $tail_text =~ /Chapters:\s*(\d+)/i;
    my ($words)    = $tail_text =~ /Words:\s*([\d,]+)/i;
    my ($updated)  = $tail_text =~ /Updated:\s*([0-9\/]+)/i;
    my ($published)= $tail_text =~ /Published:\s*([0-9\/]+)/i;
    # Fandom is the text before " - Rated:" on the metadata line only.
    # The tail starts with the reviews link and the summary, so grabbing
    # from the start of the tail would swallow both of those.
    my $fandom = '';
    for my $line (split /\n/, $tail_text) {
        if ($line =~ /\A\s*(.*?)\s*-\s*Rated:/i) {
            $fandom = $1;
            last;
        }
    }
    $chapters  = defined $chapters  ? $chapters  : 1;
    $words     = defined $words     ? $words     : '?';
    $updated   = defined $updated   ? $updated   : '?';
    $published = defined $published ? $published : '?';
    $fandom    = defined $fandom    ? $fandom    : '';
    push @stories, { id => $sid, chapters => $chapters + 0, words => $words,
                     updated => $updated, published => $published,
                     fandom => $fandom, title => $title, slug => $slug };
}

if (!@stories) {
    print STDERR "No own stories found for user id $user_id. Either the id "
               . "is wrong, the author has no public stories, the profile "
               . "page only lists favourites, or FFN changed its profile HTML.\n";
    exit 2;
}

my $story = $stories[0];
print "Most recent story: '$story->{title}' (/s/$story->{id}/, "
    . "$story->{words} words, $story->{chapters} chapters, updated $story->{updated})\n";
print "  (First own story on the profile page, which FFN sorts by Updated;\n"
    . "   favourited stories by other authors were skipped. An old story\n"
    . "   updated recently would outrank a new one.)\n"
    if @stories > 1;

# --- 2. every chapter, one fetch each ---------------------------------------
my $story_slug = $story->{slug} ne '' ? $story->{slug} : slugify($story->{title});
my @chapters;
for my $n (1 .. $story->{chapters}) {
    print "Fetching chapter $n/$story->{chapters}...\n";
    my $ch_html;
    if (defined $chapter_dir) {
        my $path = File::Spec->catfile($chapter_dir, "$n.html");
        if (!-e $path) {
            print STDERR "Test chapter file missing: $path\n";
            exit 2;
        }
        $ch_html = read_file_or_die($path);
    }
    else {
        my ($code, $html, $err) = fetch_url("$BASE/s/$story->{id}/$n/$story_slug");
        if ($err ne '') { print STDERR "Fetch failed: $err\n"; exit 2; }
        if (my $blocked = check_blocked($code, $html)) {
            print STDERR "$blocked\n";
            exit 2;
        }
        if ($code != 200) {
            print STDERR "Chapter $n fetch failed: HTTP $code.\n";
            exit 2;
        }
        $ch_html = $html;
        sleep $delay if $delay && $n < $story->{chapters};
    }

    # Chapter title: the chapter dropdown option, "1. The Race" or "1".
    my $ch_title = "Chapter $n";
    if ($ch_html =~ m{<select[^>]*id=["']chap_select["'][^>]*>(.*?)</select>}is) {
        my $opts = $1;
        my @opt = $opts =~ m{<option[^>]*value=["']$n["'][^>]*>(.*?)</option>}gis;
        if (@opt) {
            my $t = strip_tags($opt[0]);
            $t =~ s/^\d+\s*[\.\-:]\s*//;
            $ch_title = $t ne '' ? $t : $ch_title;
        }
    }

    # Chapter text: storytextp (current), storytext, storycontent (old).
    # Paragraphs only, which skips the ad divs FanFicFare also strips.
    # NOTE: do not chain these matches with || -- in list context || puts
    # the match in scalar context and returns 1 instead of the capture.
    my $body;
    if ($ch_html =~ m{<div[^>]*id=["']storytextp["'][^>]*>(.*?)</div>\s*<div}is) {
        $body = $1;
    }
    elsif ($ch_html =~ m{<div[^>]*id=["']storytext["'][^>]*>(.*?)</div>\s*<div}is) {
        $body = $1;
    }
    elsif ($ch_html =~ m{<div[^>]*id=["']storycontent["'][^>]*>(.*?)</div>\s*<div}is) {
        $body = $1;
    }
    if (!defined $body) {
        if ($ch_html =~ m{<div[^>]*id=["']storytextp["'][^>]*>(.*)}is) {
            $body = $1;
        }
        elsif ($ch_html =~ m{<div[^>]*id=["']storytext["'][^>]*>(.*)}is) {
            $body = $1;
        }
        elsif ($ch_html =~ m{<div[^>]*id=["']storycontent["'][^>]*>(.*)}is) {
            $body = $1;
        }
    }
    if (!defined $body) {
        print STDERR "Could not find the story text on the chapter $n page. "
                   . "FFN may have changed its story HTML.\n";
        exit 2;
    }
    my @paras = $body =~ m{<p>(.*?)</p>}gs;
    my $text = @paras ? join("\n\n", map { strip_tags($_) } @paras)
                      : strip_tags($body);
    $text =~ s/^\s+|\s+$//g;
    push @chapters, { num => $n, title => $ch_title, text => $text };

    # Title/summary off chapter 1's page header.
    if ($n == 1) {
        my ($t) = $ch_html =~ m{<b[^>]*class=["']xcontrast_txt["'][^>]*>(.*?)</b>}is;
        $story->{page_title} = defined $t ? strip_tags($t) : $story->{title};
        my ($s) = $ch_html =~ m{<div[^>]*class=["']xcontrast_txt["'][^>]*style=["']margin-top:2px["'][^>]*>(.*?)</div>}is;
        $story->{summary} = defined $s ? strip_tags($s) : '';
    }
}

$story->{title}   = $story->{page_title} if defined $story->{page_title};
$story->{summary} = '' unless defined $story->{summary};

# --- 3. write one file per chapter -----------------------------------------
my $dir = File::Spec->catdir($out_dir, $author_name,
                             "$story->{id}-" . slugify($story->{title}));
make_path($dir);

my $meta = "TITLE: $story->{title}\nAUTHOR: $author_name (id $user_id)\n"
         . "URL: $BASE/s/$story->{id}/1/$story_slug\nSTORY ID: $story->{id}\n"
         . "FANDOM: $story->{fandom}\nLISTED WORDS: $story->{words}\n"
         . "LISTED CHAPTERS: $story->{chapters}\n"
         . "UPDATED: $story->{updated}\nPUBLISHED: $story->{published}\n"
         . "SUMMARY: $story->{summary}\n"
         . "CHAPTERS DOWNLOADED: " . scalar(@chapters) . "\n";
my $meta_path = File::Spec->catfile($dir, '00_meta.txt');
open my $mfh, '>:encoding(UTF-8)', $meta_path or die "Cannot write $meta_path: $!\n";
print $mfh $meta;
close $mfh;

my $full = '';
for my $i (0 .. $#chapters) {
    my $ch = $chapters[$i];
    my $fname = sprintf('%02d_chapter-%02d-%s.txt',
                        $i + 1, $ch->{num}, slugify($ch->{title}));
    my $path = File::Spec->catfile($dir, $fname);
    open my $fh, '>:encoding(UTF-8)', $path or die "Cannot write $path: $!\n";
    print $fh "TITLE: $story->{title}\nAUTHOR: $author_name\n"
            . "CHAPTER $ch->{num}: $ch->{title}\n\n$ch->{text}\n";
    close $fh;
    $full .= "=== Chapter $ch->{num}: $ch->{title} ===\n\n$ch->{text}\n\n";
    my $words = $ch->{text} eq '' ? 0 : scalar(split /\s+/, $ch->{text});
    print "  wrote $fname ($words words)\n";
}

my $full_path = File::Spec->catfile($dir, 'full.txt');
open my $ffh, '>:encoding(UTF-8)', $full_path or die "Cannot write $full_path: $!\n";
print $ffh "TITLE: $story->{title}\nAUTHOR: $author_name\nURL: $BASE/s/$story->{id}/1/$story_slug\n\n$full";
close $ffh;

my $total_words = $full eq '' ? 0 : scalar(split /\s+/, $full);
print "Done: $story->{title}, " . scalar(@chapters) . " chapters, "
    . "~$total_words words, in $dir/\n";
exit 0;
