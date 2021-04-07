---
noEditThisPage: true
remarksTarget: BisCore.ecschema.md
---

# BisCore

## Entity  Classes

### AnnotationElement2d

### AnnotationFrameStyle

### AnnotationLeaderStyle

### AnnotationTextStyle

### AuxCoordSystem

### AuxCoordSystem2d

### AuxCoordSystem3d

### AuxCoordSystemSpatial

### Category

### CategorySelector

### CodeSpec

### ColorBook

### DefinitionElement

### DefinitionModel

### DefinitionPartition

### DictionaryModel

### DisplayStyle

### DisplayStyle2d

### DisplayStyle3d

### Document

### DocumentCarrier

### DocumentListModel

### DocumentPartition

### Drawing

### DrawingCategory

### DrawingGraphic

### DrawingModel

### DrawingViewDefinition

### DriverBundleElement

### Element

### ElementAspect

### ElementMultiAspect

### ElementUniqueAspect

### EmbeddedFileLink

### ExternalSourceAspect

### GeometricElement

### GeometricElement2d

### GeometricElement3d

### GeometricModel

### GeometricModel2d

### GeometricModel3d

### GeometryPart

### GraphicalElement2d

### GraphicalElement3d

### GraphicalModel2d

### GraphicalType2d

### GroupInformationElement

### GroupInformationModel

### GroupInformationPartition

### InformationCarrierElement

### InformationContentElement

### InformationModel

### InformationPartitionElement

### InformationRecordElement

### InformationRecordModel

### InformationRecordPartition

### InformationReferenceElement

### LightLocation

### LineStyle

### LinkElement

### LinkModel

### LinkPartition

### Model

### ModelSelector

### OrthographicViewDefinition

### PhysicalElement

### PhysicalMaterial

### PhysicalModel

### PhysicalPartition

### PhysicalPortion

### PhysicalType

### RecipeDefinitionElement

### RenderMaterial

### RepositoryLink

### RepositoryModel

### RoleElement

### RoleModel

### SectionDrawing

### SectionDrawingModel

### Sheet

### SheetBorder

### SheetBorderTemplate

### SheetModel

### SheetTemplate

### SheetViewDefinition

### SpatialCategory

### SpatialElement

### SpatialIndex

### SpatialLocationElement

### SpatialLocationModel

### SpatialLocationPartition

### SpatialLocationPortion

### SpatialLocationType

### SpatialModel

### SpatialViewDefinition

### SubCategory

### Subject

### TemplateRecipe2d

### TemplateRecipe3d

### TemplateViewDefinition2d

### TemplateViewDefinition3d

### TextAnnotation2d

### TextAnnotation3d

### TextAnnotationData

### TextAnnotationSeed

### Texture

### TypeDefinitionElement

### UrlLink

### ViewAttachment

### ViewDefinition

### ViewDefinition2d

### ViewDefinition3d

### VolumeElement

### WebMercatorModel

## Mixins

### IParentElement

### ISubModeledElement

## Custom  Attribute  Classes

### AutoHandledProperty

### ClassHasHandler

### CustomHandledProperty

### SchemaHasBehavior

## Relationship  Classes

### BaseModelForView2d

#### Source

#### Target

### CategoryOwnsSubCategories

#### Source

#### Target

### CategorySelectorRefersToCategories

#### Source

#### Target

### CodeSpecSpecifiesCode

#### Source

#### Target

### DrawingGraphicRepresentsElement

#### Source

#### Target

### DrawingModelBreaksDownDrawing

#### Source

#### Target

### ElementDrivesElement

#### Source

#### Target

### ElementEncapsulatesElements

#### Source

#### Target

### ElementGroupsMembers

#### Source

#### Target

### ElementHasLinks

#### Source

#### Target

### ElementOwnsChildElements

#### Source

#### Target

### ElementOwnsExternalSourceAspects

#### Source

#### Target

### ElementOwnsMultiAspects

#### Source

#### Target

### ElementOwnsUniqueAspect

#### Source

#### Target

### ElementRefersToDocuments

#### Source

#### Target

### ElementRefersToElements

#### Source

#### Target

### ElementScopesCode

#### Source

#### Target

### ElementScopesExternalSourceIdentifier

#### Source

#### Target

### GeometricElement2dHasTypeDefinition

#### Source

#### Target

### GeometricElement2dIsInCategory

#### Source

#### Target

### GeometricElement3dHasTypeDefinition

#### Source

#### Target

### GeometricElement3dIsInCategory

#### Source

#### Target

### GraphicalElement2dIsOfType

#### Source

#### Target

### GraphicalElement3dRepresentsElement

#### Source

#### Target

### GraphicalType2dHasTemplateRecipe

#### Source

#### Target

### ModelContainsElements

#### Source

#### Target

### ModelModelsElement

#### Source

#### Target

### ModelOwnsSubModel

#### Source

#### Target

### ModelSelectorRefersToModels

#### Source

#### Target

### PartitionOriginatesFromRepository

#### Source

#### Target

### PhysicalElementAssemblesElements

#### Source

#### Target

### PhysicalElementIsOfType

#### Source

#### Target

### PhysicalModelBreaksDownPhysicalPortion

#### Source

#### Target

### PhysicalTypeHasTemplateRecipe

#### Source

#### Target

### RenderMaterialOwnsRenderMaterials

#### Source

#### Target

### SheetBorderHasSheetBorderTemplate

#### Source

#### Target

### SheetHasSheetTemplate

#### Source

#### Target

### SheetModelBreaksDownSheet

#### Source

#### Target

### SheetTemplateHasSheetBorder

#### Source

#### Target

### SpatialLocationIsOfType

#### Source

#### Target

### SpatialViewDefinitionUsesModelSelector

#### Source

#### Target

### SubjectOwnsPartitionElements

#### Source

#### Target

### SubjectOwnsSubjects

#### Source

#### Target

### TextAnnotation2dOwnsTextAnnotationData

#### Source

#### Target

### TextAnnotation3dOwnsTextAnnotationData

#### Source

#### Target

### TypeDefinitionHasRecipe

#### Source

#### Target

### ViewDefinitionUsesCategorySelector

#### Source

#### Target

### ViewDefinitionUsesDisplayStyle

#### Source

#### Target

### ViewIsAttached

#### Source

#### Target

## Enumerations

### AutoHandledPropertyStatementType

### CustomHandledPropertyStatementType

