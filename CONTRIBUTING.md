# Contributing

## Requirements

To set up a development environment, you need the following installed:

- [Node 10](https://nodejs.org/en/), bundled with npm

- [Typescript](http://www.typescriptlang.org/)

- Git, easy install using this script: `\\winxx\DevProg\Git\git_install_dev.bat`

- An IDE, [Visual Studio Code](https://code.visualstudio.com/) recommended

## Set up development environment

After installing, get started with the following steps on a command line:

1. Clone the repository

    ```bash
    git clone https://github.com/iTwin/ecjson2md
    ```

2. In the repository folder, configure npm to detect Bentley packages

    ```bash
    npm config set @bentley:registry https://registry.npmjs.org/
    ```

3. Run either `npm install` or `npm ci`

4. Build ecjson2md

    ```bash
    npm run build
    ```

5. Run the tests and ensure they all pass

    ```bash
    npm run test
    ```

Optionally, to generate code coverage, run

```bash
npm run cover
```

## Building integration test assets

Only build these when all unit tests are passing after local changes.

1. Execute `npm run cli:dev` to locally install ecjson2md from the development build

2. Navigate to `./test/Assets/dir/`

3. Execute `ecjson2md -i ./example.json -r ./ -o ./` example.json being each json schema that has an associated markdown file.

## Submitting pull requests

Note that these command line steps can be done in a few mouse clicks with [Github Desktop](https://desktop.github.com/) installed. Steps:

1. Stage files for commit using the normal workflow

2. Create a new local branch for the changes using  `git checkout -b <branch>`

3. Commit the changes to this new branch

4. Publish the branch using `git push -u origin <branch>`

5. Browse to the [GitHub repo](https://github.com/iTwin/ecjson2md/pullrequests?_a=mine) and create a new pull request, using your newly created branch as the source as `master` as the destination
