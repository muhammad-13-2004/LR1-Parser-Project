$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$docsDir = Join-Path $repoRoot "docs"
$tempDir = Join-Path $repoRoot ".docx-build"
$outputPath = Join-Path $docsDir "CLR-Parser-Documentation.docx"

function Assert-InRepo($Path) {
  $resolvedParent = if (Test-Path $Path) {
    (Resolve-Path $Path).Path
  } else {
    (Resolve-Path (Split-Path $Path -Parent)).Path
  }

  if (-not $resolvedParent.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to write outside repository: $Path"
  }
}

function Escape-Xml($Text) {
  return [System.Security.SecurityElement]::Escape($Text)
}

function Paragraph($Text, $Style = $null) {
  $escaped = Escape-Xml $Text
  $styleXml = if ($Style) { "<w:pPr><w:pStyle w:val=`"$Style`"/></w:pPr>" } else { "" }
  return "<w:p>$styleXml<w:r><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}

function Bullet($Text) {
  $escaped = Escape-Xml $Text
  return "<w:p><w:pPr><w:pStyle w:val=`"ListParagraph`"/><w:numPr><w:ilvl w:val=`"0`"/><w:numId w:val=`"1`"/></w:numPr></w:pPr><w:r><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}

function CodePara($Text) {
  $escaped = Escape-Xml $Text
  return "<w:p><w:pPr><w:pStyle w:val=`"Code`"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii=`"Consolas`" w:hAnsi=`"Consolas`"/><w:sz w:val=`"20`"/></w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}

Assert-InRepo $docsDir
Assert-InRepo $tempDir

New-Item -ItemType Directory -Force -Path $docsDir | Out-Null

if (Test-Path $tempDir) {
  $resolvedTemp = (Resolve-Path $tempDir).Path
  if (-not $resolvedTemp.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to delete outside repository: $resolvedTemp"
  }
  Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $tempDir "_rels") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tempDir "word\_rels") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $tempDir "word") | Out-Null

$sections = @(
  @{ Type = "Title"; Text = "CLR Parser Project Documentation" },
  @{ Type = "Para"; Text = "Project: Canonical LR(1) Parser Visualizer" },
  @{ Type = "Para"; Text = "Technology stack: React 19, Vite, D3.js, Tailwind CSS, JavaScript modules." },
  @{ Type = "Heading1"; Text = "1. Project Overview" },
  @{ Type = "Para"; Text = "This project is a browser-based Canonical LR(1) parser visualizer. It accepts a context-free grammar, builds the augmented grammar, computes FIRST sets, constructs the canonical LR(1) item collection, generates ACTION and GOTO parsing tables, and provides an interactive parser simulator." },
  @{ Type = "Para"; Text = "The main purpose of the application is educational: it helps users understand how LR(1) states, DFA transitions, parsing-table entries, conflicts, and step-by-step parsing actions are produced from a grammar." },
  @{ Type = "Heading1"; Text = "2. Main Features" },
  @{ Type = "Bullet"; Text = "Grammar input panel with built-in examples and support for alternatives using |." },
  @{ Type = "Bullet"; Text = "Whitespace-insensitive grammar parsing, so forms such as S -> A A and S->AA can produce the same grammar when symbols are unambiguous." },
  @{ Type = "Bullet"; Text = "FIRST set computation for terminals, non-terminals, epsilon, and end marker handling." },
  @{ Type = "Bullet"; Text = "Canonical LR(1) collection construction using closure and goto operations." },
  @{ Type = "Bullet"; Text = "DFA visualization with draggable states, zooming, active-state highlighting, and state inspection." },
  @{ Type = "Bullet"; Text = "ACTION and GOTO parsing table display with conflict indicators." },
  @{ Type = "Bullet"; Text = "Parser simulator that shows stack, remaining input, action, reductions, shifts, accept, and errors." },
  @{ Type = "Bullet"; Text = "CSV export for parsing tables." },
  @{ Type = "Heading1"; Text = "3. Project Structure" },
  @{ Type = "Code"; Text = "src/App.jsx - Main layout for simulator, DFA viewer, parsing table, and sidebar." },
  @{ Type = "Code"; Text = "src/context/ParserContext.jsx - Shared parser state, grammar text, generated parser data, active state, and theme state." },
  @{ Type = "Code"; Text = "src/components/GrammarInput.jsx - Grammar input UI, examples, errors, conflict summary, and parser generation button." },
  @{ Type = "Code"; Text = "src/components/DFAViewer.jsx - D3-based LR(1) DFA visualization and state inspector." },
  @{ Type = "Code"; Text = "src/components/ParsingTable.jsx - ACTION/GOTO table display and CSV export." },
  @{ Type = "Code"; Text = "src/components/ParserSimulator.jsx - Input parser simulation and step-through playback." },
  @{ Type = "Code"; Text = "src/components/FirstSetsPanel.jsx - Displays computed FIRST sets." },
  @{ Type = "Code"; Text = "src/utils/grammarUtils.js - Grammar parsing, augmentation, FIRST set logic, and FIRST-of-sequence helper." },
  @{ Type = "Code"; Text = "src/utils/lr1Utils.js - LR(1) item utilities, closure, goto, canonical collection, and parsing table generation." },
  @{ Type = "Code"; Text = "src/utils/parserUtils.js - Input tokenization, LR(1) simulation, stack display, and CSV export." },
  @{ Type = "Code"; Text = "src/index.css - Global styling and cream/dark-brown theme variables." },
  @{ Type = "Heading1"; Text = "4. Application Flow" },
  @{ Type = "Bullet"; Text = "The user enters grammar text in the Grammar panel." },
  @{ Type = "Bullet"; Text = "generateParser in ParserContext calls parseGrammar to create structured productions, terminals, and non-terminals." },
  @{ Type = "Bullet"; Text = "augmentGrammar adds the augmented start production S' -> S." },
  @{ Type = "Bullet"; Text = "computeFirst builds FIRST sets for every terminal and non-terminal." },
  @{ Type = "Bullet"; Text = "buildCanonicalCollection creates LR(1) states and transition edges using closure and goto." },
  @{ Type = "Bullet"; Text = "buildParsingTable generates ACTION and GOTO tables and records shift/reduce or reduce/reduce conflicts." },
  @{ Type = "Bullet"; Text = "The UI renders the DFA, parsing table, FIRST sets, and simulator from the generated parserData object." },
  @{ Type = "Heading1"; Text = "5. Grammar Format" },
  @{ Type = "Para"; Text = "Each production should be written on a separate line. The left-hand side is followed by -> and the right-hand side may contain alternatives separated by |." },
  @{ Type = "Code"; Text = "S -> A A" },
  @{ Type = "Code"; Text = "A -> a A | b" },
  @{ Type = "Para"; Text = "The parser supports compact formatting by removing whitespace inside right-hand sides before tokenization." },
  @{ Type = "Code"; Text = "S->AA" },
  @{ Type = "Code"; Text = "A->aA|b" },
  @{ Type = "Para"; Text = "Use epsilon for empty productions. Terminals are inferred as symbols that do not appear on the left-hand side of any production." },
  @{ Type = "Heading1"; Text = "6. Core Algorithms" },
  @{ Type = "Heading2"; Text = "Grammar Parsing" },
  @{ Type = "Para"; Text = "parseGrammar reads non-empty lines, extracts the LHS and RHS, collects all non-terminals, tokenizes each RHS alternative, and identifies terminals after productions are known." },
  @{ Type = "Heading2"; Text = "FIRST Sets" },
  @{ Type = "Para"; Text = "computeFirst initializes FIRST sets for non-terminals, terminals, epsilon, and the end marker. It then repeatedly scans productions until no FIRST set changes." },
  @{ Type = "Heading2"; Text = "Closure" },
  @{ Type = "Para"; Text = "closure expands an LR(1) item set. When the symbol after the dot is a non-terminal, it adds productions for that non-terminal with lookaheads computed from FIRST(beta, lookahead)." },
  @{ Type = "Heading2"; Text = "Goto" },
  @{ Type = "Para"; Text = "goto moves the dot over a target symbol in every matching item, then applies closure to the resulting item set." },
  @{ Type = "Heading2"; Text = "Canonical Collection" },
  @{ Type = "Para"; Text = "buildCanonicalCollection starts from the augmented start item and explores goto transitions over all terminals and non-terminals. New unique item sets become DFA states." },
  @{ Type = "Heading2"; Text = "Parsing Table" },
  @{ Type = "Para"; Text = "buildParsingTable fills GOTO entries for non-terminal transitions, shift entries for terminal transitions, reduce entries for completed items, and accept for the completed augmented start item with the end marker." },
  @{ Type = "Heading1"; Text = "7. User Interface Components" },
  @{ Type = "Bullet"; Text = "GrammarInput lets users enter grammars, load examples, generate the parser, and see errors or conflicts." },
  @{ Type = "Bullet"; Text = "DFAViewer uses D3 force simulation to draw states and labeled transitions. Users can drag nodes, zoom, and click a state to inspect LR(1) items." },
  @{ Type = "Bullet"; Text = "ParsingTable displays ACTION and GOTO entries and highlights active rows or transitions during simulation." },
  @{ Type = "Bullet"; Text = "ParserSimulator tokenizes user input, runs the LR(1) simulation, and shows the step trace." },
  @{ Type = "Bullet"; Text = "FirstSetsPanel displays computed FIRST sets for each non-terminal." },
  @{ Type = "Heading1"; Text = "8. Running the Project" },
  @{ Type = "Code"; Text = "npm install" },
  @{ Type = "Code"; Text = "npm run dev" },
  @{ Type = "Para"; Text = "The development server is provided by Vite. The production build can be checked with:" },
  @{ Type = "Code"; Text = "npm run build" },
  @{ Type = "Heading1"; Text = "9. Testing and Verification Notes" },
  @{ Type = "Para"; Text = "The current project does not include an automated test suite. Verification is performed by running the production build and manually checking grammar generation, DFA state construction, parsing-table entries, and simulator traces." },
  @{ Type = "Para"; Text = "Recent verification confirmed that compact and spaced grammars can produce equivalent parser data for examples such as S -> A A / S->AA, and that npm run build completes successfully." },
  @{ Type = "Heading1"; Text = "10. Known Limitations and Future Improvements" },
  @{ Type = "Bullet"; Text = "Input tokenization for parser simulation currently splits input strings by whitespace." },
  @{ Type = "Bullet"; Text = "The grammar parser infers terminals and non-terminals automatically, so ambiguous compact grammars should use clear symbol naming." },
  @{ Type = "Bullet"; Text = "Automated unit tests could be added for grammar parsing, FIRST sets, closure/goto, canonical collection size, parsing table conflicts, and simulator behavior." },
  @{ Type = "Bullet"; Text = "The DFA layout could add save/restore positions for repeated analysis sessions." },
  @{ Type = "Bullet"; Text = "The documentation could be extended with screenshots after final UI design approval." },
  @{ Type = "Heading1"; Text = "11. Dependencies" },
  @{ Type = "Bullet"; Text = "react and react-dom: frontend UI framework." },
  @{ Type = "Bullet"; Text = "vite and @vitejs/plugin-react: development server and production bundling." },
  @{ Type = "Bullet"; Text = "d3: interactive DFA visualization." },
  @{ Type = "Bullet"; Text = "tailwindcss and @tailwindcss/vite: styling toolchain." },
  @{ Type = "Bullet"; Text = "eslint and React ESLint plugins: linting support." },
  @{ Type = "Heading1"; Text = "12. Summary" },
  @{ Type = "Para"; Text = "The CLR Parser project combines compiler-design algorithms with an interactive React interface. It provides a practical learning tool for understanding how Canonical LR(1) parsers are generated and how input strings are accepted or rejected through ACTION and GOTO table execution." }
)

$body = New-Object System.Collections.Generic.List[string]
foreach ($section in $sections) {
  switch ($section.Type) {
    "Title" { $body.Add((Paragraph $section.Text "Title")) }
    "Heading1" { $body.Add((Paragraph $section.Text "Heading1")) }
    "Heading2" { $body.Add((Paragraph $section.Text "Heading2")) }
    "Bullet" { $body.Add((Bullet $section.Text)) }
    "Code" { $body.Add((CodePara $section.Text)) }
    default { $body.Add((Paragraph $section.Text)) }
  }
}

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    $($body -join "`n    ")
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$stylesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="160"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/><w:color w:val="2D1B10"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="300"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="3A2114"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="260" w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="3A2114"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="180" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="5A351F"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Code">
    <w:name w:val="Code"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:spacing w:before="80" w:after="80"/><w:shd w:val="clear" w:color="auto" w:fill="F3E3CB"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="20"/><w:color w:val="2D1B10"/></w:rPr>
  </w:style>
</w:styles>
"@

$numberingXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>
"@

$contentTypesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>
"@

$relsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@

$documentRelsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"@

Set-Content -LiteralPath (Join-Path $tempDir "[Content_Types].xml") -Value $contentTypesXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempDir "_rels\.rels") -Value $relsXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempDir "word\document.xml") -Value $documentXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempDir "word\styles.xml") -Value $stylesXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempDir "word\numbering.xml") -Value $numberingXml -Encoding UTF8
Set-Content -LiteralPath (Join-Path $tempDir "word\_rels\document.xml.rels") -Value $documentRelsXml -Encoding UTF8

if (Test-Path $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $outputPath)

Remove-Item -LiteralPath $tempDir -Recurse -Force

Write-Host "Created $outputPath"
