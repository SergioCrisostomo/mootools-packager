# MooTools packager

MooTools Packager, to compile source files with dependencies. This packager is a de-gruntified version of the [grunt mootools packager](https://github.com/ibolmo/grunt-mootools-packager), to be able to compile source code from script without being inside a Grunt task.

## Getting Started
This plugin requires Grunt `~0.4.2`

You may install this plugin with this command:

```shell
npm install mootools-packager --save-dev
```

Once the plugin has been installed, it may be enabled inside your project with this line of JavaScript:

```js
var packager = require('mootools-packager');
```

## Usage

You can use the packager with `packager(sourceFiles, packagerOptions[, destinationFile]);`.
The output of this packager can be writen in a file or passed into a callback.


## Options

#### options.strip
Type: `String` or `Array<String|RegExp>`
Default value: `false`

A single, or multiple, strings or regexp to remove from the combined code.

#### options.separator
Type: `String`
Default value: `grunt.util.linefeed`

The delimeter to join all the source files together.

#### options.callback
Type: `Function`

The function to be called when compilation is finished. The compiled content will passed as the first argument in the callback function.

#### options.noOutput
Type: `Boolean`

If `true` no files will be written. Defaults to false.

#### options.removeCoreDependencies
Type: `Boolean`

If `true` removes MooTools Core dependencies.

#### options.name
Type: `String` or `Object`

The package name. TODO: Use package.json.

The name of the package, or, if there are multiple packages being built, an
object with the names and paths to their source files.

```js
options: {
  name: {
    Core: 'js/mootools-core',
    More: 'js/mootools-more'
  }
}
```

#### options.ignoreYAMLheader
Type: `Booelan`
Default value: `false`

Ignores the YAML headers for dependency loading.

#### options.only
Type: `String` or `Array`

The specific components or packages to compile (with their dependencies).

