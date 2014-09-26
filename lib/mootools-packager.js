/*
 * refactor from: grunt-mootools-packager
 * to be used as a library for Grunt specs and compiler for source codes
 *
 * https://github.com/ibolmo/grunt-mootools-packager
 *
 * Copyright (c) 2014 Olmo Maldonado
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs');
var YAML = require('js-yaml');

var DESC_REGEXP = /\/\*\s*^---([.\s\S]*)^(?:\.\.\.|---)\s*\*\//m;
var SL_STRIP_EXP = ['\\/[\\/*]\\s*<', '>(.*?)<\\/', '>(?:\\s*\\*\\/)?'];
var ML_STRIP_EXP = ['\\/[\\/*]\\s*<', '>([.\\s\\S]*?)<\\/', '>(?:\\s*\\*\\/)?'];
var PACKAGE_DOT_STAR = /(.*)\/\*$/;

// ensures the definition has a name and a provision
function validDefinition(definition){
	return 'name' in definition && 'provides' in definition;
}

// returns primary key of a definition
function getPrimaryKey(definition){
	return definition.package + '/' + definition.name;
}

// provides keys to the source file based on the name and the components provided
function getKeys(definition){
	return definition.provides.map(function(component){
		return definition.package + '/' + component;
	}).concat(getPrimaryKey(definition));
}

// matches project name with component's path
function getProjectName(componentPath, optionsName){
	if (typeof optionsName == 'string') return optionsName;
	var projectName;
	for (var prj in optionsName){
		if (~componentPath.indexOf(optionsName[prj])) projectName = prj;
	}
	if (!projectName) console.log('Missing name in options for component with path: ' + componentPath);
	return projectName;
}

// wraps item in an array if it isn't one
function toArray(object){
	if (!object || !object.length) return [];
	return typeof object == 'string' ? [object] : object;
}

// verifies that an item is in the registry of components
function checkRegistry(registry, key, path){
	if (registry[key] == undefined){
		throw new Error('Dependency not found: ' + key + ' in ' + path);
	}
}

// fixes requires keys to use package/key; allows for dependencies that
// use the `/Key` or just `Key` convention to refer to a component within
// the same package
function fixDependencyKey(key, packageName){
	// support `requires: /SomethingInThisPackage`
	if (key.indexOf('/') == 0) key = packageName + key;
	// support `requires: SomethingInThisPackage`
	if (key.indexOf('/') == -1) key = packageName + '/' + key;
	return key;
}

module.exports = function(files, options, dest){

	var packages = {}, registry = {}, included = {},
		set = [], buffer = [];

	options.strip = options.strip || [];
	options.separator = process.platform === 'win32' ? '\r\n' : '\n';

	function resolveDeps(definition){
		definition.key = fixDependencyKey(definition.key);
		if (included[definition.key]) return;
		included[definition.key] = true;

		if (!options.ignoreYAMLheader){
			definition.requires.forEach(function(key){
				key = fixDependencyKey(key, definition.package);
				checkRegistry(registry, key, definition.filepath);
				resolveDeps(registry[key]);
			});
		}
		buffer.push(definition);
	}

	// loads a component and its dependencies
	// if the key given is a package and a wildcard, loads all of them
	// e.g. `Package/Component` OR `Package/*`
	function loadComponent(key){
		var wildCardMatch = key.match(PACKAGE_DOT_STAR);
		if (wildCardMatch){
			packages[wildCardMatch[1]].forEach(loadComponent);
		} else {
			if (key in registry) resolveDeps(registry[key]);
			else throw new Error('Missing key: ' + key);
		}
	}

	// read files and populate registry map
	files.forEach(function(filepath){

		var source = fs.readFileSync(filepath, 'utf8');
		var definition = YAML.load(source.match(DESC_REGEXP)[1] || '');
		if (!definition || !validDefinition(definition)) return console.log('invalid definition: ' + filepath);
		definition.filepath = filepath;
		definition.package = getProjectName(filepath, options.name);
		definition.source = source;
		definition.key = getPrimaryKey(definition);
		definition.provides = toArray(definition.provides);

		// assume requires are relative to the package, if no package provided
		definition.requires = toArray(definition.requires).map(function(component){
			return ~component.indexOf('/') ? component : (definition.package + '/' + component);
		});
		// track all files collected, used to check that all sources were included
		set.push(definition.key);

		getKeys(definition).forEach(function(key){
			if (key in registry && key != definition.key){
				return console.log('key: ' + key + ', has repeated definition: ' + filepath);
			}
			registry[key] = definition;
		});
	});

	set.forEach(function(key){
		var definition = registry[key];
		if (!packages[definition.package]) packages[definition.package] = []
		packages[definition.package].push(key);
	});

	if (options.verbose){
		console.log('Loaded packages:')
		for (var p in packages){
			console.log('Package: ', p);
			console.log(' ', packages[p])
		}
	}

	var only = options.only;
	if (options.verbose) console.log('compiling', filepath, 'with dependencies:', only || 'all'); 

	// load each component into the buffer list
	(only ? toArray(only) : set).forEach(loadComponent);
	
	// remove MooTools Core dependencies
	if (options.removeCoreDependencies) buffer = buffer.filter(function(def){
		return def.key.indexOf('Core/') != 0;
	});
	
	
	// convert the buffer into the actual source
	buffer = buffer.map(function(def){
		return def.source;
	}).join(options.separator);

	// strip blocks
	toArray(options.strip).forEach(function(block){
		buffer = buffer.replace(RegExp(SL_STRIP_EXP.join(block), 'gm'), '')
			.replace(RegExp(ML_STRIP_EXP.join(block), 'gm'), '');
	});

	if (options.verbose){
		console.log('successfully compiled', filepath, 'with dependencies:', only || 'all');
	}

	var cb = options.callback;
	if (cb) cb(buffer);
	if (options.noOutput) return;
	fs.writeFileSync(dest, buffer, 'utf8');
};
