#!/usr/bin/env perl
# scrape_ao3_latest.pl -- grab a writer's most recent AO3 story, all chapters, into a folder.
#
#   perl scripts/scrape_ao3_latest.pl <username> [--out DIR] [--delay SECONDS]
#
# Example:
#   perl scripts/scrape_ao3_latest.pl Naminesfriend
#   perl scripts/scrape_ao3_latest.pl Naminesfriend --out corpus --delay 6
#
# What it does:
#   1. Fetches https://archiveofourown.org/users/<username>/works
#   2. Takes the FIRST work on that page. AO3 sorts a works page by Date
#      Updated by default, so "first" means most recently updated, which
#      for a new story is the same as most recent. That is a real caveat:
#      if an author updates an old story, that old story jumps to the top.
#   3. Fetches that work with ?view_full_work=true (whole story, every
#      chapter, on one page) and splits it into one text file per chapter
#      in  out/<username>/<work_id>-<slug>/
#        00_meta.txt        title, author, url, words, chapters, date, summary
#        01_chapter-01-<slug>.txt
#        02_chapter-02-<slug>.txt
#        ...
#        full.txt           all chapters concatenated
#
# Dependencies: core Perl only (strict, warnings, Getopt::Long, File::Path,
# File::Spec) plus curl on PATH. No CPAN modules on purpose: this box has
# Perl 5.38 with no Mojo, no LWP, no HTML::* installed, and curl with a
# full Chrome user-agent is the fetch method already proven to work
# against AO3's Cloudflare front door (plain HTTP clients get a 525 SSL
# handshake error). Keeping it dependency-free means it runs on the
# author's machine as-is, not just here.
#
# Politeness: 4 second delay between requests by default (AO3 asks for
# this). Sends cookie view_adult=true so the adult-content interstitial
# does not eat the fetch. Sends a real Chrome user-agent string.
#
# Offline test flags (for testing the parsers without hitting AO3):
#   --works-file FILE   parse this saved works-list HTML instead of fetching
#   --work-file FILE    parse this saved full-work HTML instead of fetching
#
# Exit codes: 0 ok, 1 usage error, 2 fetch/parse failure (AO3 down, user
# not found, no works, work page unparseable). A 418 from AO3 means the
# site is serving its maintenance page, not the work, and the script says
# so instead of writing garbage.

use strict;
use warnings;
use Getopt::Long qw(GetOptions);
use File::Path qw(make_path);
use File::Spec;

my $UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
       . '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
my $BASE = 'https://archiveofourown.org';

my $out_dir = 'out';
my $delay   = 4;
my $works_file;
my $work_file;
my $help;

GetOptions(
    'out=s'       => \$out_dir,
    'delay=i'     => \$delay,
    'works-file=s' => \$works_file,
    'work-file=s'  => \$work_file,
    'help'         => \$help,
) or die "Usage: $0 <username> [--out DIR] [--delay SECONDS]\n";

if ($help) {
    print "Usage: $0 <username> [--out DIR] [--delay SECONDS]\n"
        . "  Grabs the author's most recent AO3 story and downloads all\n"
        . "  chapters as text files into <out>/<username>/<work_id>-<slug>/\n";
    exit 0;
}

my $username = shift @ARGV or do {
    print STDERR "Usage: $0 <username> [--out DIR] [--delay SECONDS]\n";
    exit 1;
};
$username =~ s/^\s+|\s+$//g;
if ($username !~ /\A[A-Za-z0-9_\-]+\z/) {
    print STDERR "Bad username '$username': letters, digits, underscore, hyphen only.\n";
    exit 1;
}
$delay = 0 if $delay < 0;

# --- fetch: curl to a temp file, return (http_code, html) -------------------
sub fetch_url {
    my ($url) = @_;
    my $tmp = File::Spec->tmpdir() . "/ao3_fetch_$$.html";
    my @cmd = ('curl', '-s', '-L', '--max-time', '60',
               '-A', $UA, '-b', 'view_adult=true',
               '-o', $tmp, '-w', '%{http_code}', $url);
    # List-form open: no shell involved, so the parentheses and spaces in
    # the user-agent string cannot break quoting (an earlier qx{} version
    # died on exactly that: sh syntax error on "(" in the UA).
    open my $pipe, '-|', @cmd or return (0, '', "cannot run curl: $!");
    my $code = <$pipe>;
    close $pipe;
    chomp $code if defined $code;
    my $curl_status = $? >> 8;
    if ($curl_status != 0 || !defined $code || $code !~ /\A\d+\z/) {
        unlink $tmp if -e $tmp;
        return (0, '', "curl failed (exit $curl_status) fetching $url");
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

sub check_down {
    my ($code, $html) = @_;
    return 'AO3 returned HTTP 418: the site is serving its maintenance '
         . 'page, not the requested page. AO3 has been down since '
         . '2026-10-29 after a security incident; try again when it is back.'
        if $code == 418;
    return 'AO3 returned HTTP 525 (Cloudflare SSL handshake failed)'
        if $code == 525;
    if ($html =~ /Request temporarily denied|down for maintenance/i) {
        return 'AO3 is serving its maintenance page, not the requested page '
             . "(HTTP $code). AO3 has been down since 2026-10-29 after a "
             . 'security incident; try again when it is back.';
    }
    return '';
}

# --- 1. works list: first work = most recently updated ----------------------
print "Fetching works list for '$username'...\n";
my ($works_html, $works_code);
if (defined $works_file) {
    $works_html = read_file_or_die($works_file);
    $works_code = 200;
}
else {
    my ($code, $html, $err) = fetch_url("$BASE/users/$username/works");
    if ($err ne '') { print STDERR "Fetch failed: $err\n"; exit 2; }
    if (my $down = check_down($code, $html)) {
        print STDERR "$down\n";
        exit 2;
    }
    if ($code != 200) {
        print STDERR "Works list fetch failed: HTTP $code for user '$username' "
                   . "(user may not exist, or works may be locked).\n";
        exit 2;
    }
    ($works_code, $works_html) = ($code, $html);
    sleep $delay if $delay;
}

# AO3 work blurbs: <li ... class="... work blurb group ..."> ... </li>
# Same shape the old Python scrape_works_list.py used.
my @works;
while ($works_html =~ m{<li[^>]*class="[^"]*work blurb group[^"]*"[^>]*>(.*?)</li>}gs) {
    my $block = $1;
    my ($url, $title) = $block =~ m{
        <h4\ class="heading">\s*<a\ href="(/works/\d+)">(.*?)</a>
    }sx;
    next unless $url && defined $title;
    $title = strip_tags($title);
    my ($words) = $block =~ m{<dd class="words">\s*([\d,]+)\s*</dd>}s;
    $words = defined $words ? $words : '?';
    my ($chapters) = $block =~ m{<dd class="chapters">\s*([^<]+?)\s*</dd>}s;
    $chapters = defined $chapters ? strip_tags($chapters) : '?';
    my ($date) = $block =~ m{<p class="datetime">([^<]+)</p>}s;
    $date = defined $date ? strip_tags($date) : '?';
    my ($id) = $url =~ m{/works/(\d+)};
    push @works, { url => $url, id => $id, title => $title,
                   words => $words, chapters => $chapters, date => $date };
}

if (!@works) {
    print STDERR "No works found for user '$username'. Either the username "
               . "is wrong, the user has no public works, or AO3 changed "
               . "its works-list HTML.\n";
    exit 2;
}

my $work = $works[0];
print "Most recent story: '$work->{title}' ($work->{url}, "
    . "$work->{words} words, chapters $work->{chapters}, updated $work->{date})\n";
print "  ($works[0]->{title} is first on the works page, which AO3 sorts "
    . "by Date Updated; an old story updated recently would outrank a new one.)\n"
    if @works > 1;

# --- 2. full work: every chapter on one page -------------------------------
print "Fetching full work $work->{url}?view_full_work=true ...\n";
my $work_html;
if (defined $work_file) {
    $work_html = read_file_or_die($work_file);
}
else {
    my ($code, $html, $err) = fetch_url("$BASE$work->{url}?view_full_work=true");
    if ($err ne '') { print STDERR "Fetch failed: $err\n"; exit 2; }
    if (my $down = check_down($code, $html)) {
        print STDERR "$down\n";
        exit 2;
    }
    if ($code != 200) {
        print STDERR "Work fetch failed: HTTP $code for $work->{url}.\n";
        exit 2;
    }
    $work_html = $html;
}

my ($page_title) = $work_html =~ m{<h2 class="title heading">\s*(.*?)\s*</h2>}s;
$page_title = defined $page_title ? strip_tags($page_title) : $work->{title};

my ($summary) = $work_html =~ m{
    <div\ class="summary\ module".*?
    <blockquote\ class="userstuff">(.*?)</blockquote>
}sx;
$summary = defined $summary ? strip_tags($summary) : '';

my ($start) = $work_html =~ m{id="chapters"} ? index($work_html, 'id="chapters"') : -1;
if ($start < 0) {
    print STDERR "Could not find the chapters region in the work page. "
               . "AO3 may have changed its work HTML.\n";
    exit 2;
}
my $region = substr($work_html, $start);
my $end = index($region, 'id="feedback"');
$region = substr($region, 0, $end) if $end > 0;

# Each chapter: <div class="chapter" id="chapter-N"> ... <h3 class="title">
# <a ...>Chapter N</a>: Title ... <div class="userstuff module" ...> text
my @chapters;
while ($region =~ m{
    <div\ class="chapter"\ id="chapter-(\d+)"[^>]*>
    (.*?)
    (?=<div\ class="chapter"\ id="chapter-\d+"[^>]*>|\z)
}gsx) {
    my ($num, $body) = ($1, $2);
    my ($ctitle) = $body =~ m{<h3 class="title">\s*(.*?)\s*</h3>}s;
    $ctitle = defined $ctitle ? strip_tags($ctitle) : "Chapter $num";
    $ctitle =~ s/^\s*Chapter\s+\d+\s*:\s*//i;
    my ($text_html) = $body =~ m{<div class="userstuff module"[^>]*>(.*?)</div>}s;
    # userstuff can nest divs; take from its start to the chapter end and
    # strip tags instead of trusting a non-greedy close.
    if (!defined $text_html) {
        my $us = index($body, 'class="userstuff module"');
        $text_html = $us >= 0 ? substr($body, $us) : '';
    }
    my $text = strip_tags($text_html);
    # strip_tags leaves the "Chapter Text" landmark heading in; drop it.
    $text =~ s/^Chapter Text\s*//;
    push @chapters, { num => $num + 0, title => $ctitle, text => $text };
}

if (!@chapters) {
    print STDERR "No chapters parsed from the work page. AO3 may have "
               . "changed its work HTML.\n";
    exit 2;
}
@chapters = sort { $a->{num} <=> $b->{num} } @chapters;

# --- 3. write one file per chapter -----------------------------------------
my $dir = File::Spec->catdir($out_dir, $username,
                             "$work->{id}-" . slugify($page_title));
make_path($dir);

my $meta = "TITLE: $page_title\nAUTHOR: $username\n"
         . "URL: $BASE$work->{url}\nWORK ID: $work->{id}\n"
         . "LISTED WORDS: $work->{words}\nLISTED CHAPTERS: $work->{chapters}\n"
         . "UPDATED: $work->{date}\n"
         . "SUMMARY: $summary\n"
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
    print $fh "TITLE: $page_title\nAUTHOR: $username\n"
            . "CHAPTER $ch->{num}: $ch->{title}\n\n$ch->{text}\n";
    close $fh;
    $full .= "=== Chapter $ch->{num}: $ch->{title} ===\n\n$ch->{text}\n\n";
    my $words = $ch->{text} eq '' ? 0 : scalar(split /\s+/, $ch->{text});
    print "  wrote $fname ($words words)\n";
}

my $full_path = File::Spec->catfile($dir, 'full.txt');
open my $ffh, '>:encoding(UTF-8)', $full_path or die "Cannot write $full_path: $!\n";
print $ffh "TITLE: $page_title\nAUTHOR: $username\nURL: $BASE$work->{url}\n\n$full";
close $ffh;

my $total_words = $full eq '' ? 0 : scalar(split /\s+/, $full);
print "Done: $page_title, " . scalar(@chapters) . " chapters, "
    . "~$total_words words, in $dir/\n";
exit 0;
