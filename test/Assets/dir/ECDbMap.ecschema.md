---
noEditThisPage: true
Schema: ECDbMap
Warning: This file was automatically generated via ecjson2md. Do not edit this file. Any edits made to this file will be overwritten the next time it is generated.
---

# ECDbMap

**alias:** ecdbmap

**version:** 2.0.0

Custom attributes that customize ECDb's ECSchema to database mapping.

**displayLabel:** ECDb DB Mapping

## Custom Attribute Classes

### **ClassMap** *Sealed* [!badge text="CustomAttributeClass" kind="info"]

**description:** &lt;No description&gt;

**Applies to:** EntityClass, RelationshipClass

#### Properties

|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
|MapStrategy|Defines how the ECClass is mapped to table(s). Values: OwnTable (default), TablePerHierarchy, ExistingTable, NotMapped|||false|0|
|TableName|If MapStrategy is 'ExistingTable' provide the table name here. Must not be set in all other cases.|||false|0|
|ECInstanceIdColumn|Optionally specify the name of custom 'primary key' column which must be of type Int64.|||false|0|

### **DbIndexList** *Sealed* [!badge text="CustomAttributeClass" kind="info"]

**description:** &lt;No description&gt;

**Applies to:** EntityClass, RelationshipClass

#### Properties

|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
|Indexes|List of indexes on properties of this class. It can be use to improve query performance or to add unique constraint.|||false|0|

### **ForeignKeyConstraint** *Sealed* [!badge text="CustomAttributeClass" kind="info"]

**description:** Creates a foreign key for this navigation property.

**Applies to:** NavigationProperty

#### Properties

|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
|OnDeleteAction|Possible values: NoAction (default), Cascade (which deletes child rows when parent row is deleted), SetNull(foreign key property in child is set to NULL), Restrict (cannot delete parent if it still has children).|||false|0|
|OnUpdateAction|Possible values: NoAction (default), Cascade (which updates child foreign key when parent primary key is updated).|||false|0|

### **JoinedTablePerDirectSubclass** *Sealed* [!badge text="CustomAttributeClass" kind="info"]

**description:** Maps subclasses and their children to a joined table. Can only be applied to classes in a hierarchy using MapStrategy TablePerHierarchy.

**Applies to:** EntityClass

### **LinkTableRelationshipMap** *Sealed* [!badge text="CustomAttributeClass" kind="info"]

**description:** &lt;No description&gt;

**Applies to:** RelationshipClass

#### Properties

|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
|SourceECInstanceIdColumn|Optional. If not set, a default column name will be used|||false|0|
|TargetECInstanceIdColumn|Optional. If not set, a default column name will be used|||false|0|
|CreateForeignKeyConstraints|Default: true. If set to false, no foreign key constraints are created on the link table. In that case, deleting instance does not delete its relationships in the link table.|||false|0|
|AllowDuplicateRelationships|Default: false. If set to true duplicate relationships are allowed.|||false|0|

### **PropertyMap** *Sealed* [!badge text="CustomAttributeClass" kind="info"]

**description:** &lt;No description&gt;

**Applies to:** PrimitiveProperty

#### Properties

|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
|ColumnName|If not specified, the ECProperty name is used. It must follow EC Identifier specification.|||false|0|
|IsNullable|If false, values must not be unset for this property.|||false|0|
|IsUnique|Only allow unique values for this property.|||false|0|
|Collation|Specifies how string comparisons should work for this property. Possible values: Binary (default): bit to bit matching. NoCase: The same as binary, except that the 26 upper case characters of ASCII are folded to their lower case equivalents before comparing. Note that it only folds ASCII characters. RTrim: The same as binary, except that trailing space characters are ignored.|||false|0|

### **SchemaMap** *Sealed* [!badge text="CustomAttributeClass" kind="info"]

**description:** &lt;No description&gt;

**Applies to:** Schema

#### Properties

|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
|TablePrefix|Specifies a prefix for generated tables. If not specified, the alias of the ECSchema is used|||false|0|

### **ShareColumns** *Sealed* [!badge text="CustomAttributeClass" kind="info"]

**description:** Allows to share columns amongst ECProperties. Can only be applied to MapStrategy TablePerHierarchy

**Applies to:** EntityClass, RelationshipClass

#### Properties

|    Name    | Description |    Label    |  Category  |    Read Only     |    Priority    |
|:-----------|:------------|:------------|:-----------|:-----------------|:---------------|
|ApplyToSubclassesOnly|False (Default):Columns are shared for the properties of the ECClass to which this CA is applied and all its subclasses. True: Columns are not shared for this ECClass but for all of its subclasses.|||false|0|
|MaxSharedColumnsBeforeOverflow|Maximum number of shared columns to use before using an overflow table (optional). If not specified, ECDb will create as many shared columns until the table has 63 columns.|||false|0|

### **DbIndex** *Sealed* [!badge text="StructClass" kind="info"]

**description:** Specify a database index for an ECClass.

#### Properties

|    Name    |  Description  |    Label    |  Category  |    Read Only     |    Priority    |
|:-----------|:--------------|:------------|:-----------|:-----------------|:---------------|
|Name|Name of the index. Must follow EC identifier rules. It needs to be globally unique in the database.|||false|0|
|IsUnique|Default: false. If true, all values in the indexed properties must be unique.|||false|0|
|Properties|List of properties that make up the index. Only properties of primitive type are supported.|||false|0|
|Where|Where constraint for index|||false|0|