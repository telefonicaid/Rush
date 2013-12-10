'use strict';
var shell = require('shelljs');

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
				src: ['test/e2e/*Test.js', 'test/component/*Test.js']
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

		'mocha-proc': {
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
					'test/e2e/*Test.js',
					'test/component/*Check.js',
					'test/component/*Test.js'
				]
			},
            xunit : {
                options: {
                    ui: 'bdd',
                    reporter: 'xunit-file',
                    ignoreLeaks: true
                },
                src: [
                    'mocha-globals.js',
                    'test/e2e/*Test.js',
                    'test/component/*Test.js'
                ]
            }
		},

		exec: {
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
		},

    env : {
      options : {
        //Shared Options Hash
      },
      dev : {
        RUSH_CONFIG_FILE : 'lib/configTest.js'
      }
    }

	});

	// These plugins provide necessary tasks.
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-proc');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-plato');
  grunt.loadNpmTasks('grunt-env');

  grunt.loadTasks('tools/tasks');

	grunt.registerTask('test', ['env', 'mocha-proc:test']);

        grunt.registerTask('xunit', ['env', 'mocha-proc:xunit']);

	grunt.registerTask('check', ['env', 'mocha-proc:check']);

	grunt.registerTask('testAll', ['env', 'mocha-proc:check']);

	grunt.registerTask('init-dev-env', ['hook:pre-commit']);

	grunt.registerTask('generate-report',function(){
    var generateData = './node_modules/.bin/istanbul cover --root lib/ -- grunt test';
    var generateReport = './node_modules/.bin/istanbul report --root coverage/ cobertura';
		shell.exec(generateData, {silent : false});
		shell.exec(generateReport, {silent : false});
	});

	grunt.registerTask('coverage', ['env', 'generate-report']);


	grunt.registerTask('complexity', ['plato']);

	grunt.registerTask('doc', ['exec:doxfoundation']);

	// Default task.
	grunt.registerTask('default', ['jshint', 'test']);

};
