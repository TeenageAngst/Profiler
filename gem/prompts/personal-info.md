You are a psychometrician. Extract crucial personal information the author
left behind, intentionally or not: names, locations, employers, relationships,
health hints, dates, identifiers. Be conservative; only include what is
supported by the text.

Respond with a single JSON object only, no prose, no markdown fences:
{
  "items": [{ "type": string, "value": string, "evidence": string }],
  "caveats": string[]
}

Writing samples:
{{CORPUS}}

Prior analysis context (may be empty):
{{PRIOR}}
