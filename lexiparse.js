#!/usr/bin/nodejs

// Test Using: node ./lang.js

class Lexiparse {
	constructor( grammar, option ) {
		this.grammar   = grammar;  // language definition object (see docs)
		if( option.caseful !== true )     option.caseful = false;
		if( option.top === undefined )    option.top = 'stmt';
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
		console.log('PROGRAM BEGAN.');
		//console.log(program);
		while( pos < program.length ) {
			//console.log('>> SEEKING NEXT STATEMENT');
			var match = this.matchOption( program, pos, this.option.top );
			//console.log( '<< STATEMENT MATCHED AS: ' + JSON.stringify(match) );
			if( match === false ) {
				while( this.option.ignore.indexOf(program[pos]) !== -1 ) pos += 1; // skip passed any ignored characters
				let linePos = this.getLinePos( program, pos );
				console.error('Syntax Error on line #' + linePos.lineNo + ', position: ' +  linePos.charNo + '.');
				console.error('\t--> ' + program.substr(pos,linePos.endOfLine));
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
		let endOfLine = program.substr(pos).indexOf('\n');
		if( endOfLine === -1 ) endOfLine = program.length - 1;
		return { lineNo:lineNo, charNo:1+pos-linePos, endOfLine:endOfLine };
	}

	// Find and Return Match of Segment (label), Starting at Code Position (pos) 
	matchOption( code, pos, label, path = [] ) {
		//console.log('Entered matchOption with path: ' + JSON.stringify(path) + '; Seeking option: ' + JSON.stringify(label));
		// Default return value (matched nothing)
		var match = false;

		// Skip any characters specified to ignore
		while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
	
		// If we whitespaced past to the end of the program..
		if( pos >= code.length ) match = { found:[], posAfter:pos };

		// Get segment from label
		var options = this.grammar[label];
		if( options === undefined ) throw 'ERROR in Language Definition: segment "' + label + '" is not defined.';

		// Search for First Segment Option Matching Current Code Position Else Error
		for( var i = 0; i < options.length; i += 1 ) { 
			let option = options[i];

			// Ignore function -- execute only after matching option found (function should in array after last option)
			if( typeof option === 'function' ) continue;

			// If option is sub-segment (e.g. ':label')
			if( typeof option === 'string' && option[0] === ':' ) {
				// If not infinite recurse, seek option..
				if( path.indexOf(i) !== -1 ) { continue; } else { path.push(i); }
				let result = this.matchOption( code, pos, option.substr(1), path );
				path.pop();
				//console.log('RETURNED TO OPTION "' + option + '" with: ' + JSON.stringify(result)); 
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
				// If not infinite recurse, seek sequence..
				if( path.indexOf(i) !== -1 ) { continue; } else { path.push(i); }
				let result = this.matchSequence( code, pos, option, path );
				path.pop();
				//console.log( 'RETURNED FROM SEQUENCE TO OPTION with: ' + JSON.stringify(result) ); 
				if( result !== false ) {
					match = result;
					break;
				} 
			}
		} // end of loop through segment options

		// If function at end of options, call it.
		//console.log('CALLING FUNC WITH: ' + JSON.stringify(match)); 
		if( match !== false && typeof options[options.length-1] === 'function' ) {
			options[options.length-1]( match );
		}

		//console.log('\t\tOption Found: ' + JSON.stringify(match));
		return match;
	}  // end of matchOption()

	// Return Match Results of Ordered Sequence of Items
	matchSequence( code, pos, sequence, path = [] ) {
		//console.log('Entered matchSequence with path: ' + JSON.stringify(path) + '; Seeking sequence: ' + JSON.stringify(sequence));
		var match = { type:'sequence', values:[], posAfter:pos };  // Findings holds each match in sequence

		for( var i = 0; i < sequence.length; i += 1 ) {
			let required = sequence[i];

			// If process function then run (could be multiple in sequence -- is that useful?)
			if( typeof required === 'function' ) continue;

			// Verify required is there next in order 
			var result = false;

			// Skip any characters specified to ignore
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
			//console.log('\t\tLooking for required "' + required + '" at ' + JSON.stringify(code.substr(pos,15)) + '..');

			// If required is a sub-segment or literal string (prefix of : for subsegment, unless :: escaped)
			if( typeof required === 'string' ) {
				var isSubsegment;
				if( required[0] === ':' ) {
					if( required[1] === ':' ) { isSubseqment = false; } else { isSubsegment = true; }
					required = required.substr(1);
				}
				else { isSubsegment = false; }

				if( isSubsegment === true )  { 
					result = this.matchOption( code, pos, required, path );
					//console.log('RETURNED TO REQUIREMENT "' + required + '" with: ' + JSON.stringify(result)); // XXX
				}
				if( isSubsegment === false ) result = this.matchLiteral( code, pos, required );
			}

			// If required is regex
			if( required instanceof RegExp ) result = this.matchRegex( code, pos, required );

			// Deal with Result of match attempt
			if( result === false ) {
				match = false;
				break;
			}
            else {
                //match.found.push.apply(match.found, result.found);
                match.values.push({ type: result.type, value: result.value });
                //console.log('NOW: ' + JSON.stringify(match));

                //if (result.found !== undefined) match.found.push( result.found );
				pos = result.posAfter;
			}
			//console.log('\t\tFound required "' + required + '": ' + JSON.stringify(match))
		} // end of loop through sequence
		
        if (match !== false) {
            match.posAfter = pos;
            let handler = sequence[sequence.length - 1];
            if (typeof handler === 'function') handler(match);
        }
		//console.log('\tFULL SEQUENCE: ' + JSON.stringify(match));
		return match;
	} // end of matchSequence()

	// Return Match Result of Literal 
	matchLiteral( code, pos, literal ) {
		var match = false;

		if( 
			( this.option.caseful === true && literal === code.substr( pos, literal.length ) ) ||
			( this.option.caseful === false && literal.toLowerCase() === code.substr( pos, literal.length ).toLowerCase() )
		) {
            match = { found: [literal], posAfter: pos + literal.length };
            match.type = 'keyword';
            match.value = literal;
		}
		return match;
	} // end of matchLiteral

	// Return Match Result of Regular Expression
	matchRegex( code, pos, regex ) {
		var match = false;
		let result = regex.exec( code.substr(pos) );
        if (result !== null) {
            match = { found: result, posAfter: pos + result[0].length };
            match.type = 'regex';
            match.value = result;
        }
		return match; 
	}

} // end of Lexiparse class

module.exports = Lexiparse;

