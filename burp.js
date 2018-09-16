#!/usr/bin/nodejs

var Lexiparse = require('./lexiparse.js');
var prompt = require('prompt-sync')();



// ===================<< Language Support Functions >>=========================
var variable = {};  // to hold variables of the "burp" language

function input( detail ) {
	detail.type  = 'text';
	detail.value = prompt(''); 
	console.log('\t* input ' + JSON.stringify(detail));
}

function ask(detail) {
    //console.log('\t* ask ' + JSON.stringify(detail));
	detail.type  = 'string';
	detail.value = prompt('>>> ' + detail.values[1].value + '? '); 
}

function output( detail ) {
	//console.log('\t* output ' + JSON.stringify(detail));
	console.log( '>>> ' + detail.values[2].value );
}

function assignVar( detail ) {
	let name = detail.values[0].value;
	variable[name] = detail.values[2].value;
	//console.log('\t* assignVar ' + JSON.stringify(detail));
}

function readVar( detail ) {
	detail.value = variable[detail.values[0].value];
    detail.type = typeof detail.value;
	//console.log('\t* readVar ' + JSON.stringify(detail));
}

function add( detail ) {
	//console.log('\t* add ' + JSON.stringify(detail));
	detail.value = detail.values[0].value + detail.values[2].value;
    detail.type = typeof detail.value;
}

function subtract( detail ) {
	//console.log('\t* subtract ' + JSON.stringify(detail));
	detail.value = detail.values[0].value - detail.values[2].value;
    detail.type = typeof detail.value;
}

function varRef(detail) {
    detail.type = 'var';
    detail.value = detail.found[0];
	//console.log('\t* varRef ' + JSON.stringify(detail));
}

function numlit( detail ) {
	detail.type = 'number';
    detail.value = Number(detail.found[0]);
	//console.log('\t* number literal ' + JSON.stringify(detail));
}

function strlit( detail ) {
	detail.type = 'text';
	detail.value = detail.found[1];
	//console.log('\t* text literal ' + JSON.stringify(detail));
}

// ======================<< Language Definition >>=============================
// segment_name: { options:[ string | [sequence array ending with func], func] }

let grammar = {
	'stmt':[
		['output','=',':expr', output],
		[':var','=',':expr', assignVar],
		//['if',':cond','then',':stmt', ifthen],  // TODO
	],
	'expr':[
		['ask',':strlit', ask],
		['input', input],
		['(',':expr',')'],
		[':expr','+',':expr', add],
		[':expr','-',':expr', subtract],
		':numlit',
		':strlit',
		[':var', readVar],
	],
	'var':[/^[A-Za-z][A-Za-z0-9]*/, varRef ],
	'numlit':[/^[+-]?\d+(\.\d+)?/, numlit],
	'strlit':[/^"([^"]*)"/, strlit ]
}

// ======================<< Sample Burp Program >>========================
let program = ''
	        +'output = 15+10+1-6\n'                 // output a calculation
            + 'year = 2018\n'                       // assign number to variable
	        + 'output = "Birth Year Calculator"\n'  // output some text
	        + 'output = year\n'                     // output contents of a variable
	        + 'age = ask "Your age"\n'              // prompt user for input
	        + 'born = 2018 - age\n'                 // assign from variable and literal
	        + 'output = born\n'                     // output new variable's value
	;

var interpreter = new Lexiparse( grammar, { caseful:false, ignore:[' ','\t','\n'] } );
interpreter.run( program );


