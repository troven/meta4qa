module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        yuidoc: {
            compile: {
                name: '<%= pkg.name %>',
                description: '<%= pkg.description %>',
                version: '<%= pkg.version %>',
                url: '<%= pkg.homepage %>',
                options: {
                    themedir: "themes/yuidoc/dialect",
                    paths: ['lib/', "node_modules/meta4qa-webapi/lib/", "node_modules/meta4qa-browser/lib/", "node_modules/meta4qa-common/lib/"],
                    outdir: 'docs/js/'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-yuidoc');
    grunt.registerTask('default', ['yuidoc']);
}
