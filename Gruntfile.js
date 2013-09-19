'use strict';

module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		pkgFile: 'package.json',
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			gruntfile: {
				src: 'Gruntfile.js'
			},
			lib: {
				src: ['lib/**/*.js']
			},
			test: {
			src: ['test/e2e/*Test.js', 	'test/component/*Test.js']
			}
		},
		watch: {
			gruntfile: {
				files: '<%= jshint.gruntfile.src %>',
				tasks: ['jshint:gruntfile']
			},
			lib: {
				files: '<%= jshint.lib.src %>',
				tasks: ['jshint:lib', 'test']
			},
			test: {
				files: '<%= jshint.test.src %>',
				tasks: ['jshint:test', 'test']
			}
		},

		'mocha-hack': {
			test : {
				options: {
					ui: 'bdd',
					reporter: 'spec',
					ignoreLeaks: true
				},
				src: [
					'mocha-globals.js',
					'test/e2e/*Test.js',
					'test/component/*Test.js'
				]
			},
			check : {
				options: {
					ui: 'bdd',
					reporter: 'spec',
					ignoreLeaks: true
				},
				src: [
					'mocha-globals.js',
					'test/e2e/*Check.js',
					'test/component/*Check.js'
				]
			}

		},

		exec: {
			istanbul: {
				cmd: 'node ./node_modules/.bin/istanbul cover --root lib/ -- grunt test  &&  ' +
						'node ./node_modules/.bin/istanbul report --root coverage/ cobertura'
			},
			doxfoundation: {
				cmd: 'node ./node_modules/.bin/dox-foundation --source lib --target doc'
			}
		},

		plato: {
			options: {
				jshint: grunt.file.readJSON('.jshintrc')
			},
			lib: {
				files: {
					'report': '<%= jshint.lib.src %>'
				}
			}
		}

	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-hack');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-plato');

	grunt.loadTasks('tools/tasks');

	grunt.registerTask('test', ['mocha-hack:test']);

	grunt.registerTask('check', ['mocha-hack:check']);

	grunt.registerTask('testAll', ['mocha-hack:check']);

	grunt.registerTask('init-dev-env', ['hook:pre-commit']);

	grunt.registerTask('coverage', ['exec:istanbul']);

	grunt.registerTask('complexity', ['plato']);

	grunt.registerTask('doc', ['exec:doxfoundation']);

	// Default task.
	grunt.registerTask('default', ['jshint', 'test']);

};
