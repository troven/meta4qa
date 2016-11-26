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
                    paths: ['lib/', "dialects/webapi/lib/", "dialects/webapp/lib/", "dialects/blueprint/lib/"],
                    outdir: 'docs/js/'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-yuidoc');
    grunt.registerTask('default', ['yuidoc']);
}
