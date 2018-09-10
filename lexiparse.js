#!/usr/bin/nodejs

// Test Using: node ./lang.js

class Lexiparse {
	constructor( grammar, option ) {
		this.grammar   = grammar;  // language definition object (see docs)
		option.caseful = option.caseful === true ? true : false;
		if( option.ignore === undefined ) option.ignore = [' ','\t','\n'];
		this.option = option;
	};  // End of constructor()

	// Sort segment options from longest to shortest
	presort() {
		// TODO
	}

	// Run Program
	run( program, pos = 0 ) {
		// Execute each statement in program
		while( pos < program.length ) {
			var match = this.matchSegment( program, pos, 'top' );
			console.log( 'MATCHED STATEMENT: ' + JSON.stringify(match) );
			if( match === false ) {
				while( this.option.ignore.indexOf(program[pos]) !== -1 ) pos += 1; // skip passed any ignored characters
				let linePos = this.getLinePos( program, pos );
				console.error('Syntax Error on line #' + linePos.lineNo + ', position: ' +  linePos.charNo + '.');
				break;
			}
			pos = match.posAfter;
		}
		console.log('PROGRAM FINISHED.');
	} // end of run()

	// From program character position, return lineNo and charNo (on that last line)
	getLinePos( program, pos ) {
		var lineNo  = 1;
		var linePos = 0;
		for( var i = 0; i < pos; i += 1 ) {
			if( program[i] === '\n' ) { 
				linePos  = i+1;
				lineNo  += 1;
			}
		} 
		return { lineNo:lineNo, charNo:1+pos-linePos };
	}

	// Find and Return Match of Segment (label), Starting at Code Position (pos) 
	matchSegment( code, pos, label ) {
		console.log('MATCH SEGMENT "' +  label + '": ' + JSON.stringify(this.grammar[label]));
		// Default return value (matched nothing)
		var match = false;

		// Skip any characters specified to ignore
		while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
	
		// If we whitespaced past to the end of the program..
		if( pos >= code.length ) match = { found:[], posAfter:pos };

		// Get segment from label
		var segment = this.grammar[label];
		if( segment === undefined ) throw 'ERROR in Language Definition: segment "' + label + '" is not defined.';

		// Search for First Segment Option Matching Current Code Position Else Error
		for( var i = 0; i < segment.length; i += 1 ) {
			let option = segment[i];
			console.log('\tSEEKING OPTION: ' + JSON.stringify(option));

			// If option is sub-segment (e.g. ':label')
			if( typeof option === 'string' && option[0] === ':' ) {
				console.log('\tChecking for sub-segment "' + option.substr(1) + '"');
				let result = this.matchSegment( code, pos, option.substr(1) );
				if( result !== false ) {
					match = result;
					break;
				}
			} 

			// If option is literal
			if( typeof option === 'string' ) {
				let result = this.matchLiteral( code, pos, option );
				if( result !== false ) {
					match = result;
					break;
				}
			}

			// If option is regex
			if( option instanceof RegExp ) {
				let result = this.matchRegex( code, pos, option );
				if( result !== false ) {
					match = result;
					break;
				}
			}

			// if option is sequence 
			if( Array.isArray( option ) ) {
				let result = this.matchSequence( code, pos, option );
				if( result !== false ) {
					match = result;
					break;
				} 
			}
		} // end of loop through segment options

		return match;
	}  // end of matchSegment()

	// Return Match Results of Ordered Sequence of Items
	matchSequence( code, pos, sequence ) {
		console.log('MATCH SEQUENCE: ' + JSON.stringify(sequence));
		var match   = { found:[], posAfter:pos };
		var matched = true;

		for( var i = 0; i < sequence.length; i += 1 ) {
			let required = sequence[i];
			console.log('\tSEEKING "' + required + '" at "' + code.substr(pos,15) + '..');
			let result   = false;

			// Skip any characters specified to ignore
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

			// If required is sub-segment (e.g. ':label')
			if( typeof required === 'string' && required[0] === ':' ) result = this.matchSegment( code, pos, required.substr(1) );

			// If required is literal
			if( typeof required === 'string' ) result = this.matchLiteral( code, pos, required );

			// If required is regex
			if( required instanceof RegExp ) result = this.matchRegex( code, pos, required );

			// Deal with Result of match attempt
			if( result === false ) {
				matched = false;
				break;
			}
			else { 
				match.found.push.apply( match.found, result.found );
				pos = result.posAfter;
			}
		} // end of loop through sequence
		
		if( !matched ) { match = false; }
		else { match.posAfter = pos; console.log('\tMATCHED WHOLE SEQUENCE'); }
		return match;
	} // end of matchSequence()

	// Return Match Result of Literal 
	matchLiteral( code, pos, literal ) {
		var match = false;

		if( 
			( this.option.caseful === true && literal === code.substr( pos, literal.length ) ) ||
			( this.option.caseful === false && literal.toLowerCase() === code.substr( pos, literal.length ).toLowerCase() )
		) {
			match = { found:[literal], posAfter: pos + literal.length };
		}
		return match;
	} // end of matchLiteral

	// Return Match Result of Regular Expression
	matchRegex( code, pos, regex ) {
		var match = false;
		let result = regex.exec( code.substr(pos) );
		if( result !== null ) match = { found:result, posAfter: pos + result[0].length };
		return match; 
	}

} // end of Lexiparse class

module.exports = Lexiparse;

