# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added badges for deprecated schema items

### Fixed

- Fixed improper format in front matter generation

## [0.4.9] - 2019-03-11

### Fixed

- Fixed schema uri to reflect ECJs update

## [0.4.8] - 2019-02-06

### Added

- Added developer setup and maintenance instructions

### Fixed

- Fixed issue that blocked consumption of latest schemas

### Changed

- Updated styling for SchemaItems in markdown generation
- Refactored tests for better performance and easier updates

## [0.4.7] - 2018-12-19

### Added

- Support for `Format` and `Unit` classes

### Changed

- Automatically add `noEditThisPage` tag to generated frontmatter
- Updated formatting for `KindofQuantity` classes

## [0.4.6] - 2018-12-03

### Fixed

- Fixed links to follow standard markdown link format
- Fixed index.js not appearing in package

### Changed

- Updated package dependencies for bentley-generated packages
- Updated test suite to support updated EC version

## [0.4.5] - 2018-08-09

### Fixed

- Adjusted changelog to more closely match the format @ keepachangelog.com
- Adjusted changelog to adhere more closely to markdown linter

## [0.4.4] - 2018-08-07

### Fixed

- Made path processing less overbearing in order to work on linux

## [0.4.3] - 2018-07-27

### Fixed

- Error with search dirs

## [0.4.0] - 2018-07-26

### Changed

- Modified markdown generation for all schema item types to more closely mirror online EC documentation

### Added

- CLI now accepts the absence of search directories in the case that none are needed

### Fixed

- Modified tests to accommodate new functionality

## [0.3.2] - 2018-07-26

### Fixed

- strength and strengthDirection now display human readable values

### Changed

- Changed "Enumeration Items" header to just "Enumerations"

### Added

- Added modifier sections where applicable and appropriate
- Added tests for new/changed functionality

## [0.3.1] - 2018-07-25

### Fixed

- Re added index

## [0.3.0] - 2018-07-25

### Changed

- Revised ordering of schema items - schema items are now listed alphabetically in groups

### Fixed

- Empty lines at the end of property tables have been removed
- Extra empty line at the end of the markdown file has been removed

### Added

- Support for all schema item types - ie mixin, property category, enumeration, etc.
- Links for navigation properties
- Tests for new functionality

### Removed

- ':' from all headers

## [0.2.9] - 2018-07-06

### Changed

- Made the cli front-end more modular
- Now uses absolute file path behind the scenes for input schema path, output markdown path, and search directory paths

## [0.2.8] - 2018-07-05

### Fixed

- Moved some dependencies into dev dependencies where they belong

### Added

- Added tests for nonrelease bemetalsmith alert

## [0.2.7] - 2018-07-05

### Added

- Option to generate bemetalsmith alert in the case of a nonrelease schema

## [0.2.6] - 2018-06-29

### Added

- Documentaion for Bemetalsmith use in readme

## [0.2.5] - 2018-06-22

### Fixed

- Fixed issue with file path parsing. No longer breaks if a filepath includes ':'

### Changed

- CLI messages now display absolute file paths instead of relative ones

## [0.2.4] - 2018-06-21

### Changed

- Updated ecjs dependency which should better support mixins

## [0.2.3] - 2018-06-21

### Changed

- Updated to accepts file paths using all common path separators
- Updated to display message using OS path separator

## [0.2.2] - 2018-06-21

### Changed

- Complete overhaul of tests to increase thoroughness and accuracy

## [0.2.1] - 2018-06-20

### Changed

- Removed known ecjs issue from readme

## [0.2.0] - 2018-06-20

### Fixed

- ecjs update allows proper linking to base classes

## [0.1.12] - 2018-06-15

### Added

- Functionality to link to base class pages

### Removed

- Generation of remarks and overview headings

## [0.1.11] - 2018-06-13

### Added

- Functionality to generate front matter

## [0.1.9] - 2018-06-13

### Fixed

- Overview and remarks headers are now created for all types of classes

## [0.1.8] - 2018-06-13

### Added

- Displays property type when inherited from referenced schema
- Creates "Overview" and "Remarks" headers for human-written sections

## [0.1.7] - 2018-06-13

### Fixed

- No longer crashes when a schema has a property type from referenced schema

## [0.1.6] - 2018-06-13

### Changed

- Markdown for base classes now follows this format [Schema]:[Base Class name]
- The type listed for properties is now the primitive type instead of the property type

### Added

- Markdown now displays the extended typename of a property when available

## [0.1.5] - 2018-06-06

### Added

- Glob dependency

## [0.1.4] - 2018-06-06

### Fixed

- Further corrected package dependencies

## [0.1.3] - 2018-06-06

### Fixed

- Corrected package dependencies

## [0.1.2] - 2018-06-05

### Fixed

- CLI should actually work now when the package is imported

## [0.1.1] - 2018-06-05

### Fixed

- CLI should work now when the package is imported

## [0.1.0] - 2018-06-05

### Added

- Readme
- Changelog
- Tests
- CLI tool to convert ECSchema JSON to markdown

[Unreleased]: https://github.com/iTwin/ecjson2md/tree/master/
[0.4.9]: https://github.com/iTwin/ecjson2md/tree/0.4.9
[0.4.8]: https://github.com/iTwin/ecjson2md/tree/0.4.8
[0.4.7]: https://github.com/iTwin/ecjson2md/tree/0.4.7
[0.4.6]: https://github.com/iTwin/ecjson2md/tree/0.4.6
[0.4.5]: https://github.com/iTwin/ecjson2md/tree/0.4.5
[0.4.4]: https://github.com/iTwin/ecjson2md/tree/0.4.4
[0.4.3]: https://github.com/iTwin/ecjson2md/tree/0.4.3
[0.4.2]: https://github.com/iTwin/ecjson2md/tree/0.4.2
[0.4.1]: https://github.com/iTwin/ecjson2md/tree/0.4.1
[0.4.0]: https://github.com/iTwin/ecjson2md/tree/0.4.0
[0.3.2]: https://github.com/iTwin/ecjson2md/tree/0.3.2
[0.3.1]: https://github.com/iTwin/ecjson2md/tree/0.3.1
[0.3.0]: https://github.com/iTwin/ecjson2md/tree/0.3.0
[0.2.9]: https://github.com/iTwin/ecjson2md/tree/0.2.9
[0.2.8]: https://github.com/iTwin/ecjson2md/tree/0.2.8
[0.2.7]: https://github.com/iTwin/ecjson2md/tree/0.2.7
[0.2.6]: https://github.com/iTwin/ecjson2md/tree/0.2.6
[0.2.5]: https://github.com/iTwin/ecjson2md/tree/0.2.5
[0.2.4]: https://github.com/iTwin/ecjson2md/tree/0.2.4
[0.2.3]: https://github.com/iTwin/ecjson2md/tree/0.2.3
[0.2.2]: https://github.com/iTwin/ecjson2md/tree/0.2.2
[0.2.1]: https://github.com/iTwin/ecjson2md/tree/0.2.1
[0.2.0]: https://github.com/iTwin/ecjson2md/tree/0.2.0
[0.1.12]: https://github.com/iTwin/ecjson2md/tree/0.1.12
[0.1.11]: https://github.com/iTwin/ecjson2md/tree/0.1.11
[0.1.9]: https://github.com/iTwin/ecjson2md/tree/0.1.9
[0.1.8]: https://github.com/iTwin/ecjson2md/tree/0.1.8
[0.1.7]: https://github.com/iTwin/ecjson2md/tree/0.1.7
[0.1.6]: https://github.com/iTwin/ecjson2md/tree/0.1.6
[0.1.5]: https://github.com/iTwin/ecjson2md/tree/0.1.5
[0.1.4]: https://github.com/iTwin/ecjson2md/tree/0.1.4
[0.1.3]: https://github.com/iTwin/ecjson2md/tree/0.1.3
[0.1.2]: https://github.com/iTwin/ecjson2md/tree/0.1.2
[0.1.1]: https://github.com/iTwin/ecjson2md/tree/0.1.1
[0.1.0]: https://github.com/iTwin/ecjson2md/tree/0.1.0

<!-- This is a slightly better formatting in the VSCode markdown preview: -->
<style>
  h2 > a { font-weight: 600; }
  h2::after { content:''; display: block; border-bottom: 1px solid currentColor; opacity: .25 }
</style>
