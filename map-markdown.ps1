param(
  [string]$cSchemaPath='MDandSchemas\temp\SchemaXml',   # File path to xml Schemas we previously collected
  [string]$schemaRootPath='bis-schemas\Domains',        # File path to root of schemas
  [string]$mdPath='MDandSchemas\temp\Markdown',          # File path to generated markdown docs
  [string]$outPath='imodeljs-core\docs\bis\domains'     # Path to map the markdown and directories into
)

# Get a list of the names of the schemas that we collected
$targetList = Get-ChildItem -Path $cSchemaPath  -Recurse *ecschema.xml | % { $_.Name }

Write-Host "Schemas to map markdown for:"$targetList

# Get a list of all schema files that exist under the root
$allSchemaList = Get-ChildItem -Path $schemaRootPath -Recurse *ecschema.xml | where FullName -NotLike "*SchemaXml*" | % { $_.FullName }

Foreach($schema in $allSchemaList) {
  # If the current schema is in the target list, make a directory with the found schema's parent directory's name and
  # copy the corresponding markdown file into it.
  if($targetList.Contains((get-item $schema).Name))
  {
    # Form the path to move the markdown into
    $tempDir = $outPath+"\"+(get-item $schema).Directory.Name

    # If the file doesn't exist, create it
    if(!(Test-Path -Path $tempDir)) {
      Write-Host "Making directory" $tempDir"..."
      mkdir $tempDir
    }

    # Move the file into the directory
    $tempPath = $mdPath+"\"+(get-item $schema).BaseName.ToLower()+".md"
    Write-Host "Moving" $tempPath "to" $tempDir"..."
    Copy-Item -Path $tempPath -Destination $tempDir
  }
}

# Example:
# ./map-markdown -cSchemaPath bis-schemas\temp\SchemaXml -schemaRootPath bis-schemas\Domains -mdPath bis-schemas\temp\Markdown -outPath imodeljs-core\docs\bis\domains\