#!/usr/bin/nodejs

var Lexiparse = require('./lexiparse.js');

// ===================<< Language Support Functions >>=========================


// ======================<< Language Definition >>=============================
// segment_name: { options:[ string | [sequence array ending with func], func] }
let grammar = {
	'top':[
		'one',
		'two',
		'three',
		':boolit',
		':numlit',
		['I','AM','HAPPY']
	],
	'var':    [/^[a-z][a-z0-9]*/i],
	'numlit': [/^[+-]?\d+(\.\d+)?/],
	'strlit': [/^"[^"]*"/],
	'boolit': ['true','false'],
	'happiness':['I','AM','HAPPY']
};

// ======================<< Sample Program >>=============================
let program = 'one\n true 123.456 I AM HAPPY two ';


var interpreter = new Lexiparse( grammar, { caseful:false, ignore:[' ','\t','\n'] } );
interpreter.run( program );


