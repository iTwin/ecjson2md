import os
import shutil
import glob
import fnmatch

schemaJsonDir = os.path.join('..','MDandSchemas','temp','SchemaJson')
schemaXmlDir = os.path.join('..','MDandSchemas','temp','SchemaXml')
schemaMDDir = os.path.join('..','MDandSchemas','temp','Markdown')
schemaRootPath = os.path.join('..','bis-schemas','Domains')
targetDir = os.path.join('..','imodeljs-core','docs','bis','domains')

# Get list the schenas that we deserialized
targetList = os.listdir(schemaXmlDir)

print("Schemas to map markdown for:")
for target in targetList:
  print("\t"+target)

print("Searching schema structure under " + schemaRootPath + "...")

# Get a list of paths to all schemas that exist under the schema root
allSchemaPathList = []
for root, dirnames, filenames in os.walk(schemaRootPath):
    for filename in fnmatch.filter(filenames, '*.ecschema.xml'):
      # Don't collect schemas that are in the collected dir
      if "SchemaXml" not in filename:
        allSchemaPathList.append(os.path.join(root, filename))

print("Generating mapping...")

schemaMapping = {}
for schemaPath in allSchemaPathList:
  currentSchema = os.path.split(schemaPath)[-1]
  # Check if the schema is one that we previously collected
  if currentSchema in targetList:
    # Get the schema's parent directory
    parentDir = schemaPath.split(os.path.sep)[-2]
    # If the schema is in a Released directory, get the parent directory of it
    if parentDir == "Released":
      parentDir = schemaPath.split(os.path.sep)[-3]

    # Form the path of the corresponding markdown file
    currentSchemeParts = currentSchema.split(".")
    currentSchemaMD = currentSchemeParts[0] + "." + currentSchemeParts[-2] + ".md"
    currentSchemaMDPath = os.path.join(schemaMDDir, currentSchemaMD)

    # Form the target path of the markdown file
    currentSchemaTargetPath = os.path.join(targetDir, parentDir)

    print("\t" + currentSchemaMD + "\t---->\t" + currentSchemaTargetPath)
    schemaMapping[currentSchemaMDPath] = currentSchemaTargetPath

print("Copying files...")

# Use the mapping to copy the markdown files into where they belong
for mdFile in schemaMapping.keys():
  targetPath = schemaMapping[mdFile]

  # If the target parent directory doesn't exist, make it
  if not os.path.exists(targetPath):
    os.makedirs(targetPath)

  # Copy the markdown file into the target directory
  print("\tCopying " + mdFile + "\tto\t" + targetPath + "...")
  shutil.copy(mdFile, targetPath)