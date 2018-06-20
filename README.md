# ecjson2md

ecjson2md is a CLI tool that takes an ECSchema JSON and path to referenced schemas and generates a Markdown file based on it at a specified location.

[Change Log](https://github.com/iTwin/ecjson2md/blob/master/CHANGELOG.md)

## Installation

---------------------------------------------------------------

### Install globally (recommended)

```sh
npm install -g @bentley/ecjson2md
```

### Install locally

```sh
npm install @bentley/ecjson2md
```

## Usage

---------------------------------------------------------------

### Generate a markdown file from ECSchema JSON via command line

```sh
ecjson2md -i <path to ECSchema JSON> -r <comma or space separated search dirs> -o <directory to output markdown>
```

### Generate a markdown file from ECSChema JSON file programmatically

```Typescript
import { ECJsonMarkdownGenerator } from "@bentley/ecjsom2md";

mdGenerator = new ECJsonMarkdownGenerator(<array of search directories>);

mdGenerator.generate(<path to ECSchema JSON>, <output markdown file path>);
```

## Updating

---------------------------------------------------------------

### If installed globally

```sh
npm update -g @bentley/ecjson2md
```

### If installed locally

```sh
npm update @bentley/ecjson2md
```

## Notes

---------------------------------------------------------------

- When using the CLI tool, providing a list of directories that are separated by comma + space such as: ```-r ./one, ./two, /three``` will only add the first directory to the locator. Use only a comma or quotes instead, e.g. ```-r ./one,./two,./three``` or ```-r './one, ./two, ./three'```

## Known issues

---------------------------------------------------------------

- None _currently_