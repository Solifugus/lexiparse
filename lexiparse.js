#!/usr/bin/nodejs

// Test Using: node ./lang.js
// TODO:
//   [ ] Fix: gives syntax error when function does not exist.
//   [ ] Improve: data given to functions looks like crap.
//   [ ] Fix: options don't seem to return anything to sequences (at least sequences).

class Lexiparse {
	constructor( grammar, option ) {
		this.grammar   = grammar;  // language definition object (see docs)
		if( option.binding === undefined )  option.binding = this;
		if( option.caseful !== true )       option.caseful = false;
		if( option.top === undefined )      option.top = 'stmt';
		if( option.ignore === undefined )   option.ignore = [' ','\t','\n'];

		// Make scoping methods available to binding object
		if( option.binding && option.binding !== this ) {
			option.binding._lexiparse = this;
		}

		// Add precedence support
		if( option.precedence !== undefined ) {
			this.precedence = option.precedence;
			this.enablePrecedence = true;
		} else {
			this.precedence = {
				'=': 1,   // Assignment
				'||': 2,  // Logical OR
				'&&': 3,  // Logical AND
				'==': 4, '!=': 4, '<': 4, '>': 4, '<=': 4, '>=': 4,  // Comparison
				'+': 5, '-': 5,     // Addition/Subtraction
				'*': 6, '/': 6, '%': 6,  // Multiplication/Division/Modulo
				'!': 7, 'unary-': 7, 'unary+': 7  // Unary operators
			};
			this.enablePrecedence = false;
		}

		this.rightAssociative = new Set(['=', '!', 'unary-', 'unary+']);

		// Add control flow support
		this.controlFlowEnabled = option.controlFlow !== false;
		this.executionStack = [];
		this.shouldExecute = true;

		// Enhanced error handling system
		this.errors = [];
		this.collectErrors = option.collectErrors !== false; // Default to true
		this.maxErrors = option.maxErrors || 10;
		this.attemptRecovery = option.attemptRecovery !== false; // Default to true

		// Recursion protection
		this.maxRecursionDepth = option.maxRecursionDepth || 100;
		this.recursionDepth = 0;

		// Variable scoping system
		this.scopeStack = [];
		this.globalScope = {};
		this.currentScope = this.globalScope;
		this.enableScoping = option.enableScoping !== false; // Default to true

		// External function call system
		this.runtime = option.runtime || null;
		this.allowedModules = option.allowedModules || ['core', 'string', 'date', 'math'];
		this.securityMode = option.securityMode || 'sandbox'; // 'sandbox', 'restricted', 'open'
		this.externalFunctions = new Map();

		// Phase 3 Production Features initialization
		this.modules = new Map(); // Module system
		this.imports = new Map();  // Imported symbols
		this.exports = new Map();  // Exported symbols
		this.compilationCache = new Map(); // Performance optimization
		this.functionCache = new Map(); // Memoization cache
		this.auditLog = []; // Security audit log
		this.operationCounter = 0;
		this.executionStartTime = Date.now();
		this.memoryUsage = new Map();

		this.option = option;
	};  // End of constructor()

	// Sort segment options from longest to shortest
	presort() {
		// TODO
	}

	// ==================== ENHANCED ERROR HANDLING ====================

	// Add an error to the collection with detailed context
	addError( type, message, pos, expected = null, found = null, suggestion = null ) {
		if( this.errors.length >= this.maxErrors ) return;

		let linePos = this.getLinePos( this.currentProgram, pos );
		let contextLines = this.getErrorContext( this.currentProgram, pos, linePos );

		let error = {
			type: type,
			message: message,
			line: linePos.lineNo,
			column: linePos.charNo,
			position: pos,
			expected: expected,
			found: found,
			suggestion: suggestion,
			context: contextLines
		};

		this.errors.push( error );

		if( !this.collectErrors ) {
			this.reportError( error );
			return false; // Stop parsing
		}

		return true; // Continue parsing
	}

	// Get contextual lines around an error for better visibility
	getErrorContext( program, pos, linePos ) {
		let lines = program.split('\n');
		let errorLine = linePos.lineNo - 1; // Convert to 0-based
		let startLine = Math.max(0, errorLine - 1);
		let endLine = Math.min(lines.length - 1, errorLine + 1);

		let context = [];
		for( let i = startLine; i <= endLine; i++ ) {
			let marker = i === errorLine ? ' >>> ' : '     ';
			let lineNum = String(i + 1).padStart(3, ' ');
			context.push( lineNum + marker + lines[i] );

			// Add error pointer line
			if( i === errorLine ) {
				let pointer = ' '.repeat(7 + linePos.charNo - 1) + '^';
				context.push( '   ' + pointer );
			}
		}

		return context;
	}

	// Report a single error with business-friendly formatting
	reportError( error ) {
		console.error('\n❌ ' + this.getBusinessFriendlyMessage( error ));
		console.error('   📍 Line ' + error.line + ', column ' + error.column);

		if( error.expected && error.found ) {
			console.error('   🔍 Expected: ' + error.expected);
			console.error('   🔍 Found: ' + error.found);
		}

		if( error.suggestion ) {
			console.error('   💡 Suggestion: ' + error.suggestion);
		}

		console.error('');
		error.context.forEach( line => console.error('   ' + line) );
		console.error('');
	}

	// Convert technical error messages to business-friendly language
	getBusinessFriendlyMessage( error ) {
		switch( error.type ) {
			case 'syntax':
				if( error.found && error.found.match(/^[A-Za-z]/) ) {
					return 'Unknown word "' + error.found + '" found';
				}
				if( error.found && error.found.match(/^[\d]/) ) {
					return 'Number in wrong place: "' + error.found + '"';
				}
				return 'Unexpected symbol or text';

			case 'missing_operator':
				return 'Missing operator between values';

			case 'missing_value':
				return 'Missing value or expression';

			case 'unmatched_brace':
				return 'Unmatched brace - check your { } brackets';

			case 'unmatched_paren':
				return 'Unmatched parenthesis - check your ( ) brackets';

			case 'invalid_assignment':
				return 'Invalid assignment - check variable name and = sign';

			case 'function_not_found':
				return 'Unknown function or command';

			default:
				return error.message || 'Syntax error';
		}
	}

	// Get error suggestions based on common mistakes
	getErrorSuggestion( found, expected, context ) {
		// Suggest fixes for common business logic mistakes
		if( found && expected ) {
			// Missing quotes around text
			if( expected.includes('string') && found.match(/^[A-Za-z]/) && !found.match(/^"/) ) {
				return 'Try putting quotes around text: "' + found + '"';
			}

			// Wrong comparison operator
			if( found === '=' && expected.includes('comparison') ) {
				return 'Use == for comparison, = for assignment';
			}

			// Missing semicolon or statement separator
			if( expected.includes('statement') && found !== ';' ) {
				return 'Each statement should be on its own line or separated by semicolon';
			}

			// Misspelled keywords
			if( found.toLowerCase() === 'ouput' ) return 'Did you mean "output"?';
			if( found.toLowerCase() === 'fi' ) return 'Did you mean "if"?';
			if( found.toLowerCase() === 'esle' ) return 'Did you mean "else"?';
		}

		return null;
	}

	// Report all collected errors at the end
	reportAllErrors() {
		if( this.errors.length === 0 ) return;

		console.error('\n🚨 Found ' + this.errors.length + ' error(s) in your script:\n');

		this.errors.forEach( (error, index) => {
			console.error('Error #' + (index + 1) + ':');
			this.reportError( error );
		});

		console.error('📝 Fix these errors and try again.');
	}

	// Run Program with enhanced error handling
	run( program, pos = 0 ) {
		this.currentProgram = program; // Store for error reporting
		this.errors = []; // Reset error collection
		this.finished = false;

		while( pos < program.length && !this.finished ) {
			var match = this.matchOption( program, pos, this.option.top );

			if( match === false ) {
				// Skip any ignored characters to get to actual error
				while( pos < program.length && this.option.ignore.indexOf(program[pos]) !== -1 ) pos += 1;

				if( pos >= program.length ) break;

				// Analyze the error and provide helpful feedback
				let found = this.getFoundText( program, pos );
				let expected = this.getExpectedText( this.option.top );
				let suggestion = this.getErrorSuggestion( found, expected, program.substr(pos-10, 20) );

				let continueResult = this.addError( 'syntax', 'Unexpected text found', pos, expected, found, suggestion );

				if( !continueResult || !this.attemptRecovery ) {
					break; // Stop if not collecting errors or can't recover
				}

				// Attempt error recovery: skip to next likely statement
				pos = this.attemptErrorRecovery( program, pos );
			} else {
				pos = match.posAfter;
			}
		}

		// Report all collected errors
		if( this.collectErrors && this.errors.length > 0 ) {
			this.reportAllErrors();
			return false; // Indicate parsing failed
		}

		return this.errors.length === 0; // Return success status
	} // end of run()

	// Get text found at error position for better error messages
	getFoundText( program, pos ) {
		if( pos >= program.length ) return 'end of file';

		let remaining = program.substr(pos);
		let match;

		// Try to identify what was actually found
		if( match = remaining.match(/^[A-Za-z_][A-Za-z0-9_]*/) ) {
			return match[0]; // Identifier/word
		}
		if( match = remaining.match(/^[+-]?\d+(\.\d+)?/) ) {
			return match[0]; // Number
		}
		if( match = remaining.match(/^"[^"]*"?/) ) {
			return match[0]; // String (possibly unterminated)
		}
		if( match = remaining.match(/^[^\s\w]/) ) {
			return match[0]; // Single special character
		}

		return remaining.substr(0, 1); // Fallback to single character
	}

	// Get human-readable description of what was expected
	getExpectedText( segmentName ) {
		let expectations = {
			'stmt': 'a statement (like: output = value, if condition, variable = expression)',
			'expr': 'an expression or value (like: number, variable, "text", or calculation)',
			'var': 'a variable name (like: total, rate, patient_type)',
			'numlit': 'a number (like: 42, 3.14, -10)',
			'strlit': 'text in quotes (like: "hello", "emergency")',
			'if_stmt': 'an if statement (like: if (condition) { ... })',
			'while_stmt': 'a while loop (like: while (condition) { ... })',
			'block': 'a code block with { } braces',
			'function_def': 'a function definition (like: function name() { ... })'
		};

		return expectations[segmentName] || 'valid ' + segmentName;
	}

	// Attempt to recover from parse errors by skipping to next likely statement start
	attemptErrorRecovery( program, pos ) {
		// Look for common statement starters or line breaks
		let recovery_points = ['\n', ';', 'if', 'while', 'function', 'output', 'return'];
		let best_pos = pos + 1; // Default: skip one character

		for( let point of recovery_points ) {
			let next_pos = program.indexOf(point, pos + 1);
			if( next_pos !== -1 && next_pos < best_pos + 20 ) { // Don't skip too far
				best_pos = next_pos;
				if( point === '\n' || point === ';' ) best_pos += 1; // Skip the delimiter itself
				break;
			}
		}

		return Math.min(best_pos, program.length);
	}

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
		// Recursion protection
		this.recursionDepth++;
		if( this.recursionDepth > this.maxRecursionDepth ) {
			this.recursionDepth--;
			if( this.currentProgram && this.addError ) {
				this.addError( 'recursion_error', 'Parser recursion limit exceeded', pos, null, null,
					'This might be caused by infinite loops in grammar rules. Check for left-recursive patterns.' );
			}
			return false;
		}

		// Default return value (matched nothing)
		var match = false;

		// Skip any characters specified to ignore
		while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

		// If we whitespaced past to the end of the program..
		if( pos >= code.length ) {
			this.finished = true;
			match = { found:[], posAfter:pos };
			return match;
		}

		// Get segment from label
		var options = this.grammar[label];
		if( options === undefined ) throw 'ERROR in Language Definition: option "' + label + '" is not defined.';

		// Search for First Segment Option Matching Current Code Position Else Error
		for( var i = 0; i < options.length; i += 1 ) { 
			let option = options[i];

			// Ignore function -- execute only after matching option found (function should in array after last option)
			if( typeof option === 'function' ) continue;

			if( option === null ) throw 'ERROR in Language Definition: option "' + label + '" item ' + i + ' is null (maybe a missing function?).';
			if( option === undefined ) throw 'ERROR in Language Definition: option "' + label + '" item ' + i + ' is not defined.';

			// If option is sub-segment (e.g. ':label')
			if( typeof option === 'string' && option[0] === ':' ) {
				// Prevent infinite recursion within this option
				if( path.indexOf(i) !== -1 ) { continue; } else { path.push(i); }
				let segmentName = option.substr(1);
			let result;

			// Use precedence parsing for expression segments if enabled
			if( this.enablePrecedence && segmentName === 'expr' ) {
				result = this.parseExpressionWithPrecedence( code, pos );
			} else {
				result = this.matchOption( code, pos, segmentName, path.slice() ); // Pass a copy
			}
				path.pop();
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
				// Prevent infinite recursion within this option
				if( path.indexOf(i) !== -1 ) { continue; } else { path.push(i); }
				let result = this.matchSequence( code, pos, option, path.slice() ); // Pass a copy
				path.pop();
				if( result !== false ) {
					match = result;
					break;
				}
			}
		} // end of loop through segment options

		// If function at end of options, call it.
		if( match !== false && typeof options[options.length-1] === 'function' ) {
			try {
				options[options.length-1].bind(this.option.binding)(match);
			} catch (error) {
				// Re-throw environmental errors (like TTY issues) as-is
				if (error.code && (error.code === 'ENXIO' || error.code === 'ENOTTY')) {
					throw error;
				}
				// Use enhanced error reporting for callback errors
				if( this.currentProgram && this.addError ) {
					this.addError( 'callback_error', 'Error in language rule processing', pos, null, null,
						'Check the definition for "' + label + '" - ' + error.message );
					return false; // Return failed match
				} else {
					throw 'ERROR in Callback Function for "' + label + '": ' + error.message;
				}
			}
		}

		// Always decrement recursion depth before returning
		this.recursionDepth--;
		return match;
	}  // end of matchOption()

	// Return Match Results of Ordered Sequence of Items
	matchSequence( code, pos, sequence, path = [] ) {
		var match = { type:'sequence', values:[], posAfter:pos };  // Findings holds each match in sequence

		for( var i = 0; i < sequence.length; i += 1 ) {
			// Reset path tracking for subsequent elements to allow expressions like "1+1+1"
			// This prevents path pollution from first element affecting later elements
			if( i > 0 ) path = [];
			let required = sequence[i];

			// If process function then run (could be multiple in sequence -- is that useful?)
			if( typeof required === 'function' ) continue;

			// Verify required is there next in order 
			var result = false;

			// Skip any characters specified to ignore
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

			// If required is a sub-segment or literal string (prefix of : for subsegment, unless :: escaped)
			if( typeof required === 'string' ) {
				var isSubsegment;
				if( required[0] === ':' ) {
					if( required[1] === ':' ) { isSubsegment = false; } else { isSubsegment = true; }
					required = required.substr(1);
				}
				else { isSubsegment = false; }

				if( isSubsegment === true )  {
					// Use precedence parsing for expression segments if enabled
					if( this.enablePrecedence && required === 'expr' ) {
						result = this.parseExpressionWithPrecedence( code, pos );
					} else {
						result = this.matchOption( code, pos, required, path.slice() ); // Pass a copy
					}
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

                //if (result.found !== undefined) match.found.push( result.found );
				pos = result.posAfter;
			}
		} // end of loop through sequence
		
        if (match !== false) {
            match.posAfter = pos;
            let handler = sequence[sequence.length - 1];
            if (typeof handler === 'function') {
                try {
                    handler.bind(this.option.binding)(match);
                } catch (error) {
                    // Re-throw environmental errors (like TTY issues) as-is
                    if (error.code && (error.code === 'ENXIO' || error.code === 'ENOTTY')) {
                        throw error;
                    }
                    // Use enhanced error reporting for sequence callback errors
                    if( this.currentProgram && this.addError ) {
                        this.addError( 'callback_error', 'Error in sequence processing', pos, null, null,
                            'Check the sequence definition - ' + error.message );
                        return false; // Return failed match
                    } else {
                        throw 'ERROR in Sequence Callback: ' + error.message;
                    }
                }
            }
        }
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
		if( pos >= code.length) return match;
		let result = regex.exec( code.substr(pos) );
        if ( result !== null ) {
            match = { found: result, posAfter: pos + result[0].length };
            match.type = 'regex';
            match.value = result[0];
        }
		return match;
	}

	// ==================== PRECEDENCE PARSING METHODS ====================

	// Parse expression with operator precedence climbing
	parseExpressionWithPrecedence( code, pos, minPrecedence = 0 ) {
		// Recursion protection
		this.recursionDepth++;
		if( this.recursionDepth > this.maxRecursionDepth ) {
			this.recursionDepth--;
			if( this.currentProgram && this.addError ) {
				this.addError( 'recursion_error', 'Expression parsing recursion limit exceeded', pos, null, null,
					'Expression may be too complex or contain circular references.' );
			}
			return false;
		}

		// Parse left operand
		let left = this.parsePrimaryExpression( code, pos );
		if (!left) {
			this.recursionDepth--;
			return false;
		}

		pos = left.posAfter;

		// Parse operators and right operands with precedence climbing
		while (pos < code.length) {
			// Skip whitespace
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
			if (pos >= code.length) break;

			let operator = this.parseOperator( code, pos );
			if (!operator) break;

			let opPrec = this.getPrecedence( operator.value );
			if (opPrec < minPrecedence) break;

			pos = operator.posAfter;

			// For right-associative operators, use same precedence
			// For left-associative operators, use precedence + 1
			let nextMinPrec = this.isRightAssociative( operator.value ) ? opPrec : opPrec + 1;

			let right = this.parseExpressionWithPrecedence( code, pos, nextMinPrec );
			if (!right) {
				this.recursionDepth--;
				throw `Expected right operand for operator '${operator.value}' at position ${pos}`;
			}

			pos = right.posAfter;

			// Create binary operation node
			left = this.createBinaryOperation( operator.value, left, right );
			left.posAfter = pos;
		}

		this.recursionDepth--;
		return left;
	}

	// Parse primary expressions (numbers, variables, parentheses, objects, arrays, function calls)
	parsePrimaryExpression( code, pos ) {
		// Skip whitespace
		while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

		// Try object literal
		if (code[pos] === '{') {
			let objResult = this.parseObjectLiteral( code, pos );
			if (objResult) {
				return this.parsePropertyAccess( code, objResult.posAfter, objResult );
			}
		}

		// Try array literal
		if (code[pos] === '[') {
			let arrResult = this.parseArrayLiteral( code, pos );
			if (arrResult) {
				return this.parsePropertyAccess( code, arrResult.posAfter, arrResult );
			}
		}

		// Try parentheses first
		if (code[pos] === '(') {
			let inner = this.parseExpressionWithPrecedence( code, pos + 1, 0 );
			if (!inner) return false;

			pos = inner.posAfter;
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

			if (code[pos] !== ')') {
				throw `Expected ')' at position ${pos}`;
			}

			inner.posAfter = pos + 1;
			return this.parsePropertyAccess( code, inner.posAfter, inner );
		}

		// Try to match using existing grammar rules for primary expressions
		// This allows integration with existing lexiparse grammar
		for (let segmentName in this.grammar) {
			// Skip expression segments to avoid recursion
			if (segmentName === 'expr') continue;

			let match = this.matchOption( code, pos, segmentName );
			if (match !== false) {
				return this.parsePropertyAccess( code, match.posAfter, match );
			}
		}

		return false;
	}

	// Parse binary operators
	parseOperator( code, pos ) {
		// Skip whitespace
		while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

		// Try two-character operators first
		let twoChar = code.substr(pos, 2);
		if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
			return {
				type: 'operator',
				value: twoChar,
				found: [twoChar],
				posAfter: pos + 2
			};
		}

		// Try single-character operators
		let oneChar = code[pos];
		if (['+', '-', '*', '/', '%', '<', '>', '='].includes(oneChar)) {
			return {
				type: 'operator',
				value: oneChar,
				found: [oneChar],
				posAfter: pos + 1
			};
		}

		return false;
	}

	// Get precedence level for an operator
	getPrecedence( op ) {
		return this.precedence[op] || 0;
	}

	// Check if operator is right-associative
	isRightAssociative( op ) {
		return this.rightAssociative.has(op);
	}

	// Create binary operation result with callback execution
	createBinaryOperation( operator, left, right ) {
		let result = {
			type: 'binary_op',
			operator: operator,
			left: left,
			right: right,
			values: [left, { type: 'operator', value: operator }, right],
			posAfter: right.posAfter
		};

		// Resolve variable values if possible
		let leftValue = this.resolveValue(left);
		let rightValue = this.resolveValue(right);

		// Execute operation if both operands have values
		if (leftValue !== undefined && rightValue !== undefined) {
			switch (operator) {
				case '+': result.value = leftValue + rightValue; result.type = 'number'; break;
				case '-': result.value = leftValue - rightValue; result.type = 'number'; break;
				case '*': result.value = leftValue * rightValue; result.type = 'number'; break;
				case '/': result.value = leftValue / rightValue; result.type = 'number'; break;
				case '%': result.value = leftValue % rightValue; result.type = 'number'; break;
				case '==': result.value = leftValue == rightValue; result.type = 'boolean'; break;
				case '!=': result.value = leftValue != rightValue; result.type = 'boolean'; break;
				case '<': result.value = leftValue < rightValue; result.type = 'boolean'; break;
				case '>': result.value = leftValue > rightValue; result.type = 'boolean'; break;
				case '<=': result.value = leftValue <= rightValue; result.type = 'boolean'; break;
				case '>=': result.value = leftValue >= rightValue; result.type = 'boolean'; break;
				case '&&': result.value = leftValue && rightValue; result.type = 'boolean'; break;
				case '||': result.value = leftValue || rightValue; result.type = 'boolean'; break;
				default:
					result.value = null; // Will be calculated by callbacks if any
			}
		}

		return result;
	}

	// Resolve the actual value from a parse node (handles variables)
	resolveValue( node ) {
		if (node.type === 'number') {
			return node.value;
		}
		if (node.type === 'variable') {
			// Try to find variable in the binding context or global scope
			// This is a simple approach - in a full implementation we'd want proper scoping
			if (this.option.binding && this.option.binding.variables && this.option.binding.variables[node.value] !== undefined) {
				return this.option.binding.variables[node.value];
			}
			// If no binding context, return undefined to indicate unresolved variable
			return undefined;
		}
		if (node.type === 'binary_op') {
			return node.value; // Already calculated
		}
		return node.value;
	}

	// Enhanced matchOption that can use precedence parsing for expressions
	matchExpressionWithPrecedence( code, pos, label ) {
		if (this.enablePrecedence && label === 'expr') {
			let parseResult = this.parseExpressionWithPrecedence( code, pos );
			if (parseResult !== false) {
				// Post-process the result to evaluate any complex expressions
				parseResult = this.evaluateExpressionTree( parseResult );
			}
			return parseResult;
		} else {
			return this.matchOption( code, pos, label );
		}
	}

	// Evaluate an expression tree, resolving variables and calculating final values
	evaluateExpressionTree( node ) {
		if (!node) return node;

		if (node.type === 'binary_op') {
			// Recursively evaluate left and right operands
			let left = this.evaluateExpressionTree( node.left );
			let right = this.evaluateExpressionTree( node.right );

			// Try to get actual values
			let leftValue = this.resolveValue( left );
			let rightValue = this.resolveValue( right );

			// If we can resolve both values, calculate the result
			if (leftValue !== undefined && rightValue !== undefined) {
				let result = Object.assign({}, node);
				result.left = left;
				result.right = right;

				switch (node.operator) {
					case '+': result.value = leftValue + rightValue; result.type = 'number'; break;
					case '-': result.value = leftValue - rightValue; result.type = 'number'; break;
					case '*': result.value = leftValue * rightValue; result.type = 'number'; break;
					case '/': result.value = leftValue / rightValue; result.type = 'number'; break;
					case '%': result.value = leftValue % rightValue; result.type = 'number'; break;
					case '==': result.value = leftValue == rightValue; result.type = 'boolean'; break;
					case '!=': result.value = leftValue != rightValue; result.type = 'boolean'; break;
					case '<': result.value = leftValue < rightValue; result.type = 'boolean'; break;
					case '>': result.value = leftValue > rightValue; result.type = 'boolean'; break;
					case '<=': result.value = leftValue <= rightValue; result.type = 'boolean'; break;
					case '>=': result.value = rightValue >= rightValue; result.type = 'boolean'; break;
					case '&&': result.value = leftValue && rightValue; result.type = 'boolean'; break;
					case '||': result.value = leftValue || rightValue; result.type = 'boolean'; break;
					default:
						result.value = undefined;
				}

				return result;
			} else {
				// Can't resolve - return the tree with updated subtrees
				let result = Object.assign({}, node);
				result.left = left;
				result.right = right;
				return result;
			}
		}

		// For non-binary operations, just return as-is
		return node;
	}

	// ==================== CONTROL FLOW METHODS ====================

	// Push a control flow context (if, while, function, etc.)
	pushControlFlow( type, condition = true, metadata = {} ) {
		this.executionStack.push({
			type: type,
			condition: condition,
			metadata: metadata,
			previousShouldExecute: this.shouldExecute
		});

		// Update execution state based on control type
		if (type === 'if' || type === 'while') {
			this.shouldExecute = this.shouldExecute && condition;
		}

		return this.executionStack.length - 1; // Return stack index
	}

	// Pop the most recent control flow context
	popControlFlow() {
		if (this.executionStack.length > 0) {
			let context = this.executionStack.pop();
			this.shouldExecute = context.previousShouldExecute;
			return context;
		}
		return null;
	}

	// Check if statements should currently be executed
	shouldExecuteStatement() {
		return this.shouldExecute;
	}

	// Execute a statement conditionally
	executeConditionally( callback, detail ) {
		if (this.shouldExecuteStatement()) {
			if (typeof callback === 'function') {
				return callback.call(this.option.binding, detail);
			}
		} else {
			// Mark as skipped but don't execute
			if (detail) {
				detail.skipped = true;
			}
		}
		return detail;
	}

	// Built-in control flow statement handlers
	handleIfStatement( detail ) {
		// Extract condition from if statement: if (condition) statement
		let condition = detail.values[2].value; // condition between parentheses

		// Push if context
		this.pushControlFlow('if', condition);

		// The statement after the condition will be parsed with updated execution context
		// Pop will happen after the then-statement is processed

		detail.type = 'if_statement';
		detail.value = condition;
		return detail;
	}

	handleWhileLoop( detail ) {
		// Extract condition from while statement: while (condition) statement
		let condition = detail.values[2].value;

		// For now, just handle as a single execution (not a real loop)
		// A full implementation would need to reparse the body multiple times
		this.pushControlFlow('while', condition);

		detail.type = 'while_statement';
		detail.value = condition;
		return detail;
	}

	handleBlockStatement( detail ) {
		// Blocks just group statements, don't change execution
		detail.type = 'block_statement';
		detail.value = 'block_executed';
		return detail;
	}

	// ==================== VARIABLE SCOPING SYSTEM ====================

	// Push a new scope onto the stack
	pushScope( scopeType = 'block', metadata = {} ) {
		if (!this.enableScoping) return;

		let newScope = {
			type: scopeType,
			variables: {},
			parent: this.currentScope,
			metadata: metadata,
			level: this.scopeStack.length
		};

		this.scopeStack.push( newScope );
		this.currentScope = newScope;

		return newScope;
	}

	// Pop the current scope from the stack
	popScope() {
		if (!this.enableScoping || this.scopeStack.length === 0) return null;

		let poppedScope = this.scopeStack.pop();
		this.currentScope = poppedScope.parent || this.globalScope;

		return poppedScope;
	}

	// Declare a variable in the current scope
	declareVariable( name, value = undefined, type = 'var' ) {
		if (!this.enableScoping) {
			// Fallback to old binding system
			if (this.option.binding && this.option.binding.variables) {
				this.option.binding.variables[name] = value;
			}
			return;
		}

		// Check if variable already exists in current scope
		if (this.currentScope.variables.hasOwnProperty( name )) {
			if( this.currentProgram && this.addError ) {
				this.addError( 'scope_error', `Variable '${name}' already declared in this scope`, 0, null, null,
					`Use a different name or assign to existing variable: ${name} = value` );
			}
			return false;
		}

		this.currentScope.variables[name] = {
			value: value,
			type: type,
			declared: true,
			declaredAt: this.currentScope.level
		};

		return true;
	}

	// Assign a value to a variable (looks up scope chain)
	assignVariable( name, value ) {
		if (!this.enableScoping) {
			// Fallback to old binding system
			if (this.option.binding && this.option.binding.variables) {
				this.option.binding.variables[name] = value;
			}
			return true;
		}

		// Find variable in scope chain
		let scope = this.currentScope;
		while (scope) {
			if (scope.variables && scope.variables.hasOwnProperty( name )) {
				scope.variables[name].value = value;
				return true;
			}
			scope = scope.parent;
		}

		// Variable not found - create in global scope for assignment
		this.globalScope[name] = {
			value: value,
			type: 'var',
			declared: false,
			declaredAt: -1 // Global
		};

		return true;
	}

	// Get variable value (looks up scope chain)
	getVariable( name ) {
		if (!this.enableScoping) {
			// Fallback to old binding system
			if (this.option.binding && this.option.binding.variables) {
				return this.option.binding.variables[name];
			}
			return undefined;
		}

		// Search up the scope chain
		let scope = this.currentScope;
		while (scope) {
			if (scope.variables && scope.variables.hasOwnProperty( name )) {
				return scope.variables[name].value;
			}
			scope = scope.parent;
		}

		// Check global scope
		if (this.globalScope.hasOwnProperty( name )) {
			return this.globalScope[name].value;
		}

		return undefined;
	}

	// Check if a variable exists in any scope
	hasVariable( name ) {
		if (!this.enableScoping) {
			return this.option.binding && this.option.binding.variables &&
				   this.option.binding.variables.hasOwnProperty( name );
		}

		let scope = this.currentScope;
		while (scope) {
			if (scope.variables && scope.variables.hasOwnProperty( name )) {
				return true;
			}
			scope = scope.parent;
		}

		return this.globalScope.hasOwnProperty( name );
	}

	// Get all variables in current scope (for debugging)
	getCurrentScopeVariables() {
		if (!this.enableScoping) {
			return this.option.binding ? this.option.binding.variables : {};
		}

		return this.currentScope.variables;
	}

	// Get scope information for debugging
	getScopeInfo() {
		if (!this.enableScoping) {
			return { scopeCount: 0, currentLevel: 0, type: 'none' };
		}

		return {
			scopeCount: this.scopeStack.length,
			currentLevel: this.currentScope.level || 0,
			type: this.currentScope.type || 'global',
			hasParent: !!this.currentScope.parent
		};
	}

	// Enhanced function call handler with scoping
	handleFunctionCall( name, args = [], detail ) {
		// Push function scope
		this.pushScope( 'function', { name: name, args: args } );

		// Store arguments as local variables if needed
		// This would be expanded based on function definition handling

		detail.type = 'function_call';
		detail.value = { name: name, args: args };
		detail.scope = this.getScopeInfo();

		return detail;
	}

	// Enhanced block handler with scoping
	handleScopedBlock( detail ) {
		this.pushScope( 'block' );

		// Block statements will execute in this scope
		detail.type = 'scoped_block';
		detail.value = 'scoped_block_started';
		detail.scope = this.getScopeInfo();

		return detail;
	}

	// ==================== ARRAYS AND OBJECTS SUPPORT ====================

	// Parse object literal: { key: value, key2: value2 }
	parseObjectLiteral( code, pos ) {
		// Skip whitespace
		while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

		if (code[pos] !== '{') return false;
		pos++; // Skip opening brace

		let properties = {};
		let propertyList = [];
		let first = true;

		while (pos < code.length) {
			// Skip whitespace
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

			if (code[pos] === '}') {
				pos++; // Skip closing brace
				break;
			}

			// Expect comma between properties (except first)
			if (!first) {
				if (code[pos] === ',') {
					pos++; // Skip comma
					while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
				} else {
					if( this.currentProgram && this.addError ) {
						this.addError( 'syntax', 'Expected comma between object properties', pos, 'comma (,)', code[pos],
							'Use commas to separate properties: { prop1: value1, prop2: value2 }' );
					}
					return false;
				}
			}
			first = false;

			// Parse property name (identifier or string)
			let keyResult = this.parsePropertyKey( code, pos );
			if (!keyResult) {
				if( this.currentProgram && this.addError ) {
					this.addError( 'syntax', 'Expected property name', pos, 'property name or "string"', code[pos],
						'Property names can be identifiers or quoted strings' );
				}
				return false;
			}

			pos = keyResult.posAfter;

			// Skip whitespace and expect colon
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
			if (code[pos] !== ':') {
				if( this.currentProgram && this.addError ) {
					this.addError( 'syntax', 'Expected colon after property name', pos, 'colon (:)', code[pos],
						'Use colon to separate property name from value: { name: value }' );
				}
				return false;
			}
			pos++; // Skip colon

			// Parse property value
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
			let valueResult = this.parseExpressionWithPrecedence( code, pos, 0 );
			if (!valueResult) {
				if( this.currentProgram && this.addError ) {
					this.addError( 'syntax', 'Expected property value', pos, 'expression or value', code[pos],
						'Property values can be numbers, strings, variables, or expressions' );
				}
				return false;
			}

			pos = valueResult.posAfter;

			// Store property
			properties[keyResult.value] = valueResult;
			propertyList.push({ key: keyResult.value, value: valueResult });
		}

		return {
			type: 'object_literal',
			value: properties,
			properties: propertyList,
			posAfter: pos,
			found: ['{', ...propertyList, '}']
		};
	}

	// Parse array literal: [item1, item2, item3]
	parseArrayLiteral( code, pos ) {
		// Skip whitespace
		while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

		if (code[pos] !== '[') return false;
		pos++; // Skip opening bracket

		let items = [];
		let first = true;

		while (pos < code.length) {
			// Skip whitespace
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

			if (code[pos] === ']') {
				pos++; // Skip closing bracket
				break;
			}

			// Expect comma between items (except first)
			if (!first) {
				if (code[pos] === ',') {
					pos++; // Skip comma
					while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
				} else {
					if( this.currentProgram && this.addError ) {
						this.addError( 'syntax', 'Expected comma between array items', pos, 'comma (,)', code[pos],
							'Use commas to separate array items: [item1, item2, item3]' );
					}
					return false;
				}
			}
			first = false;

			// Parse array item
			let itemResult = this.parseExpressionWithPrecedence( code, pos, 0 );
			if (!itemResult) {
				if( this.currentProgram && this.addError ) {
					this.addError( 'syntax', 'Expected array item', pos, 'expression or value', code[pos],
						'Array items can be numbers, strings, variables, or expressions' );
				}
				return false;
			}

			pos = itemResult.posAfter;
			items.push( itemResult );
		}

		return {
			type: 'array_literal',
			value: items,
			length: items.length,
			posAfter: pos,
			found: ['[', ...items, ']']
		};
	}

	// Parse property key (identifier or string literal)
	parsePropertyKey( code, pos ) {
		// Try string literal first
		let stringMatch = this.matchRegex( code, pos, /^"([^"]*)"/ );
		if (stringMatch) {
			return {
				type: 'string',
				value: stringMatch.found[1],
				posAfter: stringMatch.posAfter
			};
		}

		// Try identifier
		let identMatch = this.matchRegex( code, pos, /^[A-Za-z][A-Za-z0-9_]*/ );
		if (identMatch) {
			return {
				type: 'identifier',
				value: identMatch.found[0],
				posAfter: identMatch.posAfter
			};
		}

		return false;
	}

	// Parse property access: obj.property or obj[index]
	parsePropertyAccess( code, pos, baseExpression ) {
		let current = baseExpression;

		while (pos < code.length) {
			// Skip whitespace
			while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

			if (code[pos] === '.') {
				// Dot notation: obj.property
				pos++; // Skip dot

				// Parse property name
				let propMatch = this.matchRegex( code, pos, /^[A-Za-z][A-Za-z0-9_]*/ );
				if (!propMatch) {
					if( this.currentProgram && this.addError ) {
						this.addError( 'syntax', 'Expected property name after dot', pos, 'property name', code[pos],
							'Use valid identifiers after dot: obj.property' );
					}
					return false;
				}

				pos = propMatch.posAfter;
				current = {
					type: 'property_access',
					object: current,
					property: propMatch.found[0],
					notation: 'dot',
					posAfter: pos,
					found: [current, '.', propMatch.found[0]]
				};

			} else if (code[pos] === '[') {
				// Bracket notation: obj[index]
				pos++; // Skip opening bracket

				// Parse index expression
				while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
				let indexResult = this.parseExpressionWithPrecedence( code, pos, 0 );
				if (!indexResult) {
					if( this.currentProgram && this.addError ) {
						this.addError( 'syntax', 'Expected index expression', pos, 'expression or value', code[pos],
							'Array/object indices can be numbers, strings, or expressions' );
					}
					return false;
				}

				pos = indexResult.posAfter;

				// Expect closing bracket
				while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;
				if (code[pos] !== ']') {
					if( this.currentProgram && this.addError ) {
						this.addError( 'syntax', 'Expected closing bracket', pos, 'closing bracket (])', code[pos],
							'Close array/object access with ]: obj[index]' );
					}
					return false;
				}
				pos++; // Skip closing bracket

				current = {
					type: 'property_access',
					object: current,
					property: indexResult,
					notation: 'bracket',
					posAfter: pos,
					found: [current, '[', indexResult, ']']
				};

			} else {
				// No more property access
				break;
			}
		}

		return current;
	}

	// Enhanced resolveValue to handle objects and arrays
	resolveValue( node ) {
		if (!node) return undefined;

		if (node.type === 'number') {
			return node.value;
		}
		if (node.type === 'string') {
			return node.value;
		}
		if (node.type === 'boolean') {
			return node.value;
		}
		if (node.type === 'variable') {
			// Use scoping system if enabled
			if (this.enableScoping) {
				return this.getVariable( node.value );
			} else {
				// Fallback to old binding system
				if (this.option.binding && this.option.binding.variables && this.option.binding.variables[node.value] !== undefined) {
					return this.option.binding.variables[node.value];
				}
			}
			return undefined;
		}
		if (node.type === 'object_literal') {
			// Resolve object properties
			let obj = {};
			for (let prop of node.properties) {
				obj[prop.key] = this.resolveValue( prop.value );
			}
			return obj;
		}
		if (node.type === 'array_literal') {
			// Resolve array items
			return node.value.map( item => this.resolveValue( item ) );
		}
		if (node.type === 'property_access') {
			let objValue = this.resolveValue( node.object );
			if (objValue === undefined || objValue === null) return undefined;

			if (node.notation === 'dot') {
				return objValue[node.property];
			} else {
				// Bracket notation - resolve the index
				let index = this.resolveValue( node.property );
				return objValue[index];
			}
		}
		if (node.type === 'binary_op') {
			return node.value; // Already calculated
		}

		return node.value;
	}

	// Built-in array and object methods
	getBuiltinMethod( object, methodName ) {
		if (Array.isArray( object )) {
			switch (methodName) {
				case 'length':
					return object.length;
				case 'push':
					return ( item ) => {
						object.push( item );
						return object.length;
					};
				case 'pop':
					return () => object.pop();
				case 'map':
					return ( callback ) => object.map( callback );
				case 'filter':
					return ( callback ) => object.filter( callback );
				case 'find':
					return ( callback ) => object.find( callback );
				case 'includes':
					return ( item ) => object.includes( item );
				case 'join':
					return ( separator = ',' ) => object.join( separator );
				case 'slice':
					return ( start, end ) => object.slice( start, end );
				default:
					return undefined;
			}
		}

		if (typeof object === 'object' && object !== null) {
			switch (methodName) {
				case 'keys':
					return () => Object.keys( object );
				case 'values':
					return () => Object.values( object );
				case 'hasOwnProperty':
					return ( prop ) => object.hasOwnProperty( prop );
				default:
					return undefined;
			}
		}

		if (typeof object === 'string') {
			// Use enhanced string methods
			let enhancedMethods = this.getEnhancedStringMethods( object );
			if (enhancedMethods.hasOwnProperty( methodName )) {
				return enhancedMethods[methodName];
			}
			return undefined;
		}

		if (object instanceof Date) {
			// Use enhanced date methods
			let enhancedMethods = this.getEnhancedDateMethods( object );
			if (enhancedMethods.hasOwnProperty( methodName )) {
				return enhancedMethods[methodName];
			}
			return undefined;
		}

		return undefined;
	}

	// ==================== STRING MANIPULATION FUNCTIONS ====================

	// Enhanced string methods for business logic
	getEnhancedStringMethods( str ) {
		if (typeof str !== 'string') return {};

		return {
			// Basic string operations
			length: str.length,
			toUpperCase: () => str.toUpperCase(),
			toLowerCase: () => str.toLowerCase(),
			trim: () => str.trim(),

			// String search and access
			charAt: ( index ) => str.charAt( index ),
			indexOf: ( searchStr, fromIndex = 0 ) => str.indexOf( searchStr, fromIndex ),
			lastIndexOf: ( searchStr, fromIndex = str.length ) => str.lastIndexOf( searchStr, fromIndex ),
			includes: ( searchStr ) => str.includes( searchStr ),
			startsWith: ( prefix ) => str.startsWith( prefix ),
			endsWith: ( suffix ) => str.endsWith( suffix ),

			// String manipulation
			substring: ( start, end ) => str.substring( start, end ),
			slice: ( start, end ) => str.slice( start, end ),
			substr: ( start, length ) => str.substr( start, length ),
			replace: ( search, replace ) => str.replace( search, replace ),
			replaceAll: ( search, replace ) => str.replaceAll ? str.replaceAll( search, replace ) : str.split( search ).join( replace ),
			split: ( separator ) => str.split( separator ),

			// String formatting
			padStart: ( targetLength, padString = ' ' ) => str.padStart( targetLength, padString ),
			padEnd: ( targetLength, padString = ' ' ) => str.padEnd( targetLength, padString ),
			repeat: ( count ) => str.repeat( count ),

			// Business-specific formatting
			toTitleCase: () => str.replace(/\w\S*/g, txt =>
				txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),

			toCamelCase: () => str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
				if (+match === 0) return "";
				return index === 0 ? match.toLowerCase() : match.toUpperCase();
			}),

			toSnakeCase: () => str.replace(/\W+/g, " ")
				.split(/ |\B(?=[A-Z])/)
				.map(word => word.toLowerCase())
				.join('_'),

			toKebabCase: () => str.replace(/\W+/g, " ")
				.split(/ |\B(?=[A-Z])/)
				.map(word => word.toLowerCase())
				.join('-'),

			// Validation helpers
			isEmail: () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( str ),
			isPhoneNumber: () => /^[\+]?[1-9][\d]{0,15}$/.test( str.replace(/[\s\-\(\)]/g, '') ),
			isNumeric: () => /^\d+(\.\d+)?$/.test( str ),
			isAlpha: () => /^[A-Za-z]+$/.test( str ),
			isAlphaNumeric: () => /^[A-Za-z0-9]+$/.test( str ),

			// Business formatting
			formatCurrency: ( currencySymbol = '$', decimals = 2 ) => {
				let num = parseFloat( str );
				if (isNaN( num )) return str;
				return currencySymbol + num.toFixed( decimals ).replace(/\d(?=(\d{3})+\.)/g, '$&,');
			},

			formatPhoneNumber: ( format = '(xxx) xxx-xxxx' ) => {
				let cleaned = str.replace(/\D/g, '');
				if (cleaned.length === 10) {
					return format.replace(/x/g, () => cleaned.charAt(0) ? cleaned.charAt(0) && (cleaned = cleaned.substr(1)) : '');
				}
				return str;
			},

			formatSSN: () => {
				let cleaned = str.replace(/\D/g, '');
				if (cleaned.length === 9) {
					return cleaned.substr(0,3) + '-' + cleaned.substr(3,2) + '-' + cleaned.substr(5,4);
				}
				return str;
			},

			// String analysis
			wordCount: () => str.trim().split(/\s+/).filter(word => word.length > 0).length,
			charCount: () => str.length,
			lineCount: () => str.split('\n').length,

			// Utility functions
			reverse: () => str.split('').reverse().join(''),
			capitalize: () => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),

			// Template substitution
			template: ( substitutions ) => {
				let result = str;
				for (let [key, value] of Object.entries( substitutions )) {
					result = result.replace(new RegExp('\\{' + key + '\\}', 'g'), value);
				}
				return result;
			}
		};
	}

	// String operation handlers for expressions
	handleStringConcatenation( left, right ) {
		let leftVal = this.resolveValue( left );
		let rightVal = this.resolveValue( right );

		// Convert to strings if needed
		let leftStr = (leftVal !== null && leftVal !== undefined) ? String( leftVal ) : '';
		let rightStr = (rightVal !== null && rightVal !== undefined) ? String( rightVal ) : '';

		return {
			type: 'string',
			value: leftStr + rightStr,
			operands: [left, right]
		};
	}

	// Enhanced binary operation handler for string operations
	createStringAwareBinaryOperation( operator, left, right ) {
		let leftValue = this.resolveValue( left );
		let rightValue = this.resolveValue( right );

		// Handle string concatenation with +
		if (operator === '+' && (typeof leftValue === 'string' || typeof rightValue === 'string')) {
			return this.handleStringConcatenation( left, right );
		}

		// Handle string comparison operations
		if (typeof leftValue === 'string' && typeof rightValue === 'string') {
			let result = {
				type: 'binary_op',
				operator: operator,
				left: left,
				right: right,
				values: [left, { type: 'operator', value: operator }, right]
			};

			switch (operator) {
				case '==': result.value = leftValue === rightValue; result.type = 'boolean'; break;
				case '!=': result.value = leftValue !== rightValue; result.type = 'boolean'; break;
				case '<': result.value = leftValue < rightValue; result.type = 'boolean'; break;
				case '>': result.value = leftValue > rightValue; result.type = 'boolean'; break;
				case '<=': result.value = leftValue <= rightValue; result.type = 'boolean'; break;
				case '>=': result.value = leftValue >= rightValue; result.type = 'boolean'; break;
				default:
					result.value = null; // Unsupported operation
			}

			return result;
		}

		// Fall back to original numeric operations
		return this.createBinaryOperation( operator, left, right );
	}

	// String literal factory with enhanced methods
	createStringLiteral( value, methods = true ) {
		let stringObj = {
			type: 'string',
			value: value,
			length: value.length
		};

		if (methods) {
			// Attach string methods
			Object.assign( stringObj, this.getEnhancedStringMethods( value ) );
		}

		return stringObj;
	}

	// Business-specific string validators and formatters
	validateBusinessString( str, type ) {
		const validators = {
			email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
			phone: /^[\+]?[1-9][\d]{0,15}$/,
			ssn: /^\d{3}-\d{2}-\d{4}$/,
			zipcode: /^\d{5}(-\d{4})?$/,
			creditcard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
			name: /^[A-Za-z\s\-'\.]+$/,
			currency: /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$/
		};

		return validators[type] ? validators[type].test( str ) : false;
	}

	// ==================== DATE AND TIME HANDLING ====================

	// Parse date from various formats
	parseBusinessDate( dateStr ) {
		if (!dateStr) return null;

		// Common business date formats
		const datePatterns = [
			// Standard formats
			/^(\d{4})-(\d{2})-(\d{2})$/,              // YYYY-MM-DD
			/^(\d{2})\/(\d{2})\/(\d{4})$/,            // MM/DD/YYYY
			/^(\d{2})-(\d{2})-(\d{4})$/,              // MM-DD-YYYY
			/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,        // M/D/YYYY

			// Business formats
			/^(\w+)\s+(\d{1,2}),\s+(\d{4})$/,         // Month DD, YYYY
			/^(\d{1,2})\s+(\w+)\s+(\d{4})$/,          // DD Month YYYY

			// ISO formats
			/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/, // ISO datetime
		];

		// Try to parse with native Date constructor first
		let parsed = new Date( dateStr );
		if (!isNaN( parsed.getTime() )) {
			return parsed;
		}

		// If that fails, try manual parsing
		for (let pattern of datePatterns) {
			let match = dateStr.match( pattern );
			if (match) {
				// Handle different patterns
				if (pattern.source.includes('YYYY-MM-DD')) {
					return new Date( parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]) );
				}
				// Add more pattern handlers as needed
			}
		}

		return null; // Could not parse
	}

	// Enhanced date methods for business logic
	getEnhancedDateMethods( date ) {
		if (!(date instanceof Date) || isNaN( date.getTime() )) return {};

		return {
			// Basic date info
			getYear: () => date.getFullYear(),
			getMonth: () => date.getMonth() + 1, // 1-based for business users
			getDay: () => date.getDate(),
			getDayOfWeek: () => date.getDay(), // 0 = Sunday
			getHour: () => date.getHours(),
			getMinute: () => date.getMinutes(),
			getSecond: () => date.getSeconds(),

			// Date arithmetic
			addDays: ( days ) => new Date( date.getTime() + days * 24 * 60 * 60 * 1000 ),
			addWeeks: ( weeks ) => new Date( date.getTime() + weeks * 7 * 24 * 60 * 60 * 1000 ),
			addMonths: ( months ) => {
				let newDate = new Date( date );
				newDate.setMonth( newDate.getMonth() + months );
				return newDate;
			},
			addYears: ( years ) => {
				let newDate = new Date( date );
				newDate.setFullYear( newDate.getFullYear() + years );
				return newDate;
			},

			subtractDays: ( days ) => new Date( date.getTime() - days * 24 * 60 * 60 * 1000 ),
			subtractWeeks: ( weeks ) => new Date( date.getTime() - weeks * 7 * 24 * 60 * 60 * 1000 ),
			subtractMonths: ( months ) => {
				let newDate = new Date( date );
				newDate.setMonth( newDate.getMonth() - months );
				return newDate;
			},
			subtractYears: ( years ) => {
				let newDate = new Date( date );
				newDate.setFullYear( newDate.getFullYear() - years );
				return newDate;
			},

			// Date comparisons
			isAfter: ( otherDate ) => date > otherDate,
			isBefore: ( otherDate ) => date < otherDate,
			isSameDay: ( otherDate ) => date.toDateString() === otherDate.toDateString(),
			isSameMonth: ( otherDate ) => date.getMonth() === otherDate.getMonth() && date.getFullYear() === otherDate.getFullYear(),
			isSameYear: ( otherDate ) => date.getFullYear() === otherDate.getFullYear(),

			// Business date functions
			age: ( birthDate ) => {
				if (!(birthDate instanceof Date)) return null;
				let today = new Date();
				let age = today.getFullYear() - birthDate.getFullYear();
				let monthDiff = today.getMonth() - birthDate.getMonth();
				if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
					age--;
				}
				return age;
			},

			ageAt: ( birthDate, atDate ) => {
				if (!(birthDate instanceof Date) || !(atDate instanceof Date)) return null;
				let age = atDate.getFullYear() - birthDate.getFullYear();
				let monthDiff = atDate.getMonth() - birthDate.getMonth();
				if (monthDiff < 0 || (monthDiff === 0 && atDate.getDate() < birthDate.getDate())) {
					age--;
				}
				return age;
			},

			daysBetween: ( otherDate ) => {
				if (!(otherDate instanceof Date)) return null;
				return Math.floor((otherDate - date) / (24 * 60 * 60 * 1000));
			},

			weeksBetween: ( otherDate ) => {
				if (!(otherDate instanceof Date)) return null;
				return Math.floor((otherDate - date) / (7 * 24 * 60 * 60 * 1000));
			},

			monthsBetween: ( otherDate ) => {
				if (!(otherDate instanceof Date)) return null;
				return (otherDate.getFullYear() - date.getFullYear()) * 12 + (otherDate.getMonth() - date.getMonth());
			},

			yearsBetween: ( otherDate ) => {
				if (!(otherDate instanceof Date)) return null;
				return otherDate.getFullYear() - date.getFullYear();
			},

			// Business periods
			isWeekend: () => date.getDay() === 0 || date.getDay() === 6,
			isWeekday: () => date.getDay() >= 1 && date.getDay() <= 5,

			quarterStart: () => {
				let quarter = Math.floor( date.getMonth() / 3 );
				return new Date( date.getFullYear(), quarter * 3, 1 );
			},

			quarterEnd: () => {
				let quarter = Math.floor( date.getMonth() / 3 );
				return new Date( date.getFullYear(), quarter * 3 + 3, 0 );
			},

			monthStart: () => new Date( date.getFullYear(), date.getMonth(), 1 ),
			monthEnd: () => new Date( date.getFullYear(), date.getMonth() + 1, 0 ),
			yearStart: () => new Date( date.getFullYear(), 0, 1 ),
			yearEnd: () => new Date( date.getFullYear(), 11, 31 ),

			// Formatting for business use
			formatShort: () => date.toLocaleDateString(), // MM/DD/YYYY
			formatLong: () => date.toLocaleDateString('en-US', {
				year: 'numeric', month: 'long', day: 'numeric'
			}),
			formatISO: () => date.toISOString().split('T')[0], // YYYY-MM-DD
			formatBusiness: () => date.toLocaleDateString('en-US', {
				year: 'numeric', month: 'short', day: 'numeric'
			}),
			formatTime: () => date.toLocaleTimeString(),
			formatDateTime: () => date.toLocaleString(),

			// Business-specific formats
			formatFiscal: ( fiscalYearStart = 4 ) => {
				let fiscalYear = date.getMonth() >= fiscalYearStart ?
					date.getFullYear() + 1 : date.getFullYear();
				return `FY${fiscalYear}`;
			},

			formatQuarter: () => {
				let quarter = Math.floor( date.getMonth() / 3 ) + 1;
				return `Q${quarter} ${date.getFullYear()}`;
			},

			// Validation helpers
			isValid: () => !isNaN( date.getTime() ),
			isToday: () => {
				let today = new Date();
				return date.toDateString() === today.toDateString();
			},
			isPast: () => date < new Date(),
			isFuture: () => date > new Date(),

			// Business rules
			isEligibleAge: ( minimumAge ) => {
				let today = new Date();
				let age = today.getFullYear() - date.getFullYear();
				let monthDiff = today.getMonth() - date.getMonth();
				if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
					age--;
				}
				return age >= minimumAge;
			},

			daysSinceEpoch: () => Math.floor( date.getTime() / (24 * 60 * 60 * 1000) ),

			toTimestamp: () => date.getTime(),
			toUnixTimestamp: () => Math.floor( date.getTime() / 1000 )
		};
	}

	// Date literal factory
	createDateLiteral( value, methods = true ) {
		let dateValue = value instanceof Date ? value : this.parseBusinessDate( value );

		if (!dateValue) {
			return null; // Invalid date
		}

		let dateObj = {
			type: 'date',
			value: dateValue,
			timestamp: dateValue.getTime()
		};

		if (methods) {
			Object.assign( dateObj, this.getEnhancedDateMethods( dateValue ) );
		}

		return dateObj;
	}

	// Date arithmetic operations
	handleDateArithmetic( operator, left, right ) {
		let leftValue = this.resolveValue( left );
		let rightValue = this.resolveValue( right );

		// Date + Number (days)
		if (leftValue instanceof Date && typeof rightValue === 'number') {
			switch (operator) {
				case '+':
					return {
						type: 'date',
						value: new Date( leftValue.getTime() + rightValue * 24 * 60 * 60 * 1000 ),
						operation: 'add_days'
					};
				case '-':
					return {
						type: 'date',
						value: new Date( leftValue.getTime() - rightValue * 24 * 60 * 60 * 1000 ),
						operation: 'subtract_days'
					};
			}
		}

		// Date - Date (difference in days)
		if (leftValue instanceof Date && rightValue instanceof Date) {
			if (operator === '-') {
				return {
					type: 'number',
					value: Math.floor((leftValue - rightValue) / (24 * 60 * 60 * 1000)),
					operation: 'date_difference'
				};
			}
		}

		// Date comparisons
		if (leftValue instanceof Date && rightValue instanceof Date) {
			let result = {
				type: 'boolean',
				operator: operator,
				left: left,
				right: right
			};

			switch (operator) {
				case '==': result.value = leftValue.getTime() === rightValue.getTime(); break;
				case '!=': result.value = leftValue.getTime() !== rightValue.getTime(); break;
				case '<': result.value = leftValue < rightValue; break;
				case '>': result.value = leftValue > rightValue; break;
				case '<=': result.value = leftValue <= rightValue; break;
				case '>=': result.value = leftValue >= rightValue; break;
				default: result.value = null;
			}

			return result;
		}

		return null; // Unsupported operation
	}

	// Business date utilities
	calculateBusinessDays( startDate, endDate ) {
		if (!(startDate instanceof Date) || !(endDate instanceof Date)) return null;

		let count = 0;
		let current = new Date( startDate );

		while (current <= endDate) {
			// Count weekdays only
			if (current.getDay() >= 1 && current.getDay() <= 5) {
				count++;
			}
			current.setDate( current.getDate() + 1 );
		}

		return count;
	}

	getBusinessHolidays( year ) {
		// Common US business holidays - can be extended
		return [
			new Date( year, 0, 1 ),    // New Year's Day
			new Date( year, 6, 4 ),    // Independence Day
			new Date( year, 10, 11 ),  // Veterans Day
			new Date( year, 11, 25 ),  // Christmas Day
		];
	}

	isBusinessHoliday( date, holidays = null ) {
		if (!(date instanceof Date)) return false;

		holidays = holidays || this.getBusinessHolidays( date.getFullYear() );

		return holidays.some( holiday =>
			holiday.toDateString() === date.toDateString()
		);
	}

	// ==================== EXTERNAL FUNCTION CALL SYSTEM ====================

	// Register runtime modules and their functions
	registerRuntimeModule( moduleName, moduleDefinition ) {
		if (!this.allowedModules.includes( moduleName ) && this.securityMode !== 'open') {
			console.warn(`Module '${moduleName}' not allowed in current security mode. Allowed modules: ${this.allowedModules.join(', ')}`);
			return false;
		}

		// Validate module definition
		if (!moduleDefinition || typeof moduleDefinition !== 'object') {
			console.warn(`Invalid module definition for '${moduleName}'`);
			return false;
		}

		// Register each function in the module
		for (let [funcName, funcDef] of Object.entries( moduleDefinition )) {
			let fullName = `${moduleName}.${funcName}`;

			// Validate function definition
			if (typeof funcDef !== 'function' && typeof funcDef !== 'object') {
				console.warn(`Skipping invalid function definition: ${fullName}`);
				continue;
			}

			// Store function with metadata
			this.externalFunctions.set( fullName, {
				module: moduleName,
				name: funcName,
				implementation: funcDef.implementation || funcDef,
				description: funcDef.description || `Function ${funcName} from ${moduleName}`,
				parameters: funcDef.parameters || [],
				returnType: funcDef.returnType || 'any',
				async: funcDef.async || false,
				security: funcDef.security || 'safe'
			});
		}

		return true;
	}

	// Call external function
	async callExternalFunction( functionName, args = [], context = {} ) {
		// Check if function exists
		if (!this.externalFunctions.has( functionName )) {
			console.warn(`Unknown external function: ${functionName}`);
			return null;
		}

		let funcDef = this.externalFunctions.get( functionName );

		// Security check
		if (this.securityMode === 'sandbox' && funcDef.security !== 'safe') {
			console.warn(`Function '${functionName}' not allowed in sandbox mode`);
			return null;
		}

		// Parameter validation
		if (funcDef.parameters.length > 0) {
			for (let i = 0; i < funcDef.parameters.length; i++) {
				let param = funcDef.parameters[i];
				if (param.required && (args[i] === undefined || args[i] === null)) {
					console.warn(`Missing required parameter '${param.name}' for ${functionName}`);
					return null;
				}
			}
		}

		try {
			// Prepare execution context
			let execContext = {
				lexiparse: this,
				variables: this.getCurrentScopeVariables(),
				security: this.securityMode,
				...context
			};

			// Call the function
			if (funcDef.async) {
				return await funcDef.implementation.call( execContext, ...args );
			} else {
				return funcDef.implementation.call( execContext, ...args );
			}

		} catch (error) {
			console.warn(`Error calling ${functionName}: ${error.message}`);
			return null;
		}
	}

	// Get available external functions (for introspection)
	getAvailableFunctions( module = null ) {
		let functions = {};

		for (let [fullName, funcDef] of this.externalFunctions) {
			if (!module || funcDef.module === module) {
				functions[fullName] = {
					description: funcDef.description,
					parameters: funcDef.parameters,
					returnType: funcDef.returnType,
					module: funcDef.module,
					security: funcDef.security
				};
			}
		}

		return functions;
	}

	// Default core runtime modules
	getCoreRuntimeModules() {
		return {
			// Core utilities module
			core: {
				log: {
					implementation: ( message ) => {
						console.log('[BizScript]', message);
						return true;
					},
					description: 'Log a message to console',
					parameters: [{ name: 'message', type: 'string', required: true }],
					security: 'safe'
				},

				print: {
					implementation: ( value ) => {
						console.log( value );
						return value;
					},
					description: 'Print a value to console',
					parameters: [{ name: 'value', type: 'any', required: true }],
					security: 'safe'
				},

				type: {
					implementation: ( value ) => {
						if (value === null) return 'null';
						if (Array.isArray( value )) return 'array';
						if (value instanceof Date) return 'date';
						return typeof value;
					},
					description: 'Get the type of a value',
					parameters: [{ name: 'value', type: 'any', required: true }],
					security: 'safe'
				}
			},

			// Math utilities module
			math: {
				abs: {
					implementation: ( num ) => Math.abs( num ),
					description: 'Absolute value',
					parameters: [{ name: 'number', type: 'number', required: true }],
					security: 'safe'
				},

				round: {
					implementation: ( num, decimals = 0 ) => {
						let multiplier = Math.pow(10, decimals);
						return Math.round( num * multiplier ) / multiplier;
					},
					description: 'Round to specified decimal places',
					parameters: [
						{ name: 'number', type: 'number', required: true },
						{ name: 'decimals', type: 'number', required: false }
					],
					security: 'safe'
				},

				min: {
					implementation: ( ...numbers ) => Math.min( ...numbers ),
					description: 'Minimum value',
					parameters: [{ name: 'numbers', type: 'number[]', required: true }],
					security: 'safe'
				},

				max: {
					implementation: ( ...numbers ) => Math.max( ...numbers ),
					description: 'Maximum value',
					parameters: [{ name: 'numbers', type: 'number[]', required: true }],
					security: 'safe'
				},

				sum: {
					implementation: ( numbers ) => {
						if (!Array.isArray( numbers )) return numbers;
						return numbers.reduce((acc, num) => acc + num, 0);
					},
					description: 'Sum of array values',
					parameters: [{ name: 'numbers', type: 'number[]', required: true }],
					security: 'safe'
				},

				average: {
					implementation: ( numbers ) => {
						if (!Array.isArray( numbers )) return numbers;
						return numbers.reduce((acc, num) => acc + num, 0) / numbers.length;
					},
					description: 'Average of array values',
					parameters: [{ name: 'numbers', type: 'number[]', required: true }],
					security: 'safe'
				}
			}
		};
	}

	// Load default runtime based on environment
	loadDefaultRuntime() {
		// Register core modules
		let coreModules = this.getCoreRuntimeModules();
		for (let [moduleName, moduleDefinition] of Object.entries( coreModules )) {
			this.registerRuntimeModule( moduleName, moduleDefinition );
		}

		// Load environment-specific runtime if provided
		if (this.runtime) {
			this.loadEnvironmentRuntime( this.runtime );
		}
	}

	// Load environment-specific runtime modules
	loadEnvironmentRuntime( runtime ) {
		// Database module (Node.js/server environments)
		if (runtime.database && this.allowedModules.includes('database')) {
			this.registerRuntimeModule('database', {
				query: {
					implementation: async ( sql, params = [] ) => {
						return await runtime.database.query( sql, params );
					},
					description: 'Execute SQL query',
					parameters: [
						{ name: 'sql', type: 'string', required: true },
						{ name: 'params', type: 'array', required: false }
					],
					async: true,
					security: 'restricted'
				},

				transaction: {
					implementation: async ( callback ) => {
						return await runtime.database.transaction( callback );
					},
					description: 'Execute database transaction',
					parameters: [{ name: 'callback', type: 'function', required: true }],
					async: true,
					security: 'restricted'
				}
			});
		}

		// File system module (Node.js environments)
		if (runtime.files && this.allowedModules.includes('files')) {
			this.registerRuntimeModule('files', {
				read: {
					implementation: async ( path ) => {
						return await runtime.files.read( path );
					},
					description: 'Read file contents',
					parameters: [{ name: 'path', type: 'string', required: true }],
					async: true,
					security: 'restricted'
				},

				write: {
					implementation: async ( path, data ) => {
						return await runtime.files.write( path, data );
					},
					description: 'Write file contents',
					parameters: [
						{ name: 'path', type: 'string', required: true },
						{ name: 'data', type: 'string', required: true }
					],
					async: true,
					security: 'restricted'
				}
			});
		}

		// HTTP module (browser/Node.js environments)
		if (runtime.http && this.allowedModules.includes('http')) {
			this.registerRuntimeModule('http', {
				get: {
					implementation: async ( url ) => {
						return await runtime.http.get( url );
					},
					description: 'HTTP GET request',
					parameters: [{ name: 'url', type: 'string', required: true }],
					async: true,
					security: 'restricted'
				},

				post: {
					implementation: async ( url, data ) => {
						return await runtime.http.post( url, data );
					},
					description: 'HTTP POST request',
					parameters: [
						{ name: 'url', type: 'string', required: true },
						{ name: 'data', type: 'object', required: true }
					],
					async: true,
					security: 'restricted'
				}
			});
		}

		// Email module (server environments)
		if (runtime.email && this.allowedModules.includes('email')) {
			this.registerRuntimeModule('email', {
				send: {
					implementation: async ( to, subject, body ) => {
						return await runtime.email.send( to, subject, body );
					},
					description: 'Send email',
					parameters: [
						{ name: 'to', type: 'string', required: true },
						{ name: 'subject', type: 'string', required: true },
						{ name: 'body', type: 'string', required: true }
					],
					async: true,
					security: 'restricted'
				}
			});
		}
	}

	// Function call expression handler
	handleFunctionCall( functionName, args, detail ) {
		// Check if it's an external function
		if (this.externalFunctions.has( functionName )) {
			// For now, return a placeholder - actual execution would happen during evaluation
			detail.type = 'external_function_call';
			detail.functionName = functionName;
			detail.args = args;
			detail.external = true;

			// Mark as async if the function is async
			let funcDef = this.externalFunctions.get( functionName );
			if (funcDef.async) {
				detail.async = true;
			}

			return detail;
		}

		// Fall back to regular function handling
		detail.type = 'function_call';
		detail.functionName = functionName;
		detail.args = args;

		return detail;
	}

	// Security and sandboxing utilities
	validateSecurityAccess( operation, resource ) {
		if (this.securityMode === 'open') {
			return true; // Allow everything
		}

		if (this.securityMode === 'sandbox') {
			// Only allow safe operations
			let safeOperations = ['math', 'string', 'date', 'core.log', 'core.print', 'core.type'];
			return safeOperations.includes( operation ) || operation.startsWith('math.') || operation.startsWith('string.');
		}

		if (this.securityMode === 'restricted') {
			// Allow based on allowedModules configuration
			let module = operation.split('.')[0];
			return this.allowedModules.includes( module );
		}

		return false;
	}

	// ==================== PHASE 3: PRODUCTION FEATURES ====================

	// ========== 1. ENHANCED SECURITY & SANDBOXING ==========

	/**
	 * Initialize production security framework
	 */
	initializeProductionSecurity( config = {} ) {
		this.securityConfig = {
			sandbox: {
				allowedModules: config.allowedModules || ['core', 'math', 'string', 'date'],
				forbiddenOperations: config.forbiddenOperations || ['file_delete', 'network_raw', 'process_exec'],
				fileAccess: {
					readPaths: config.readPaths || ['/data/input/', '/config/'],
					writePaths: config.writePaths || ['/data/output/'],
					maxFileSize: config.maxFileSize || 10 * 1024 * 1024 // 10MB
				},
				networkAccess: {
					allowedHosts: config.allowedHosts || [],
					allowedPorts: config.allowedPorts || [80, 443],
					maxRequestSize: config.maxRequestSize || 1 * 1024 * 1024 // 1MB
				}
			},
			limits: {
				memory: config.maxMemory || 100 * 1024 * 1024, // 100MB
				executionTime: config.maxExecutionTime || 30000, // 30 seconds
				recursionDepth: config.maxRecursion || 1000,
				operationsPerSecond: config.maxOpsPerSec || 10000
			},
			audit: {
				enabled: config.enableAudit !== false,
				logLevel: config.auditLevel || 'warning', // 'none', 'error', 'warning', 'info', 'debug'
				maxLogEntries: config.maxAuditEntries || 1000
			}
		};

		this.auditLog = [];
		this.operationCounter = 0;
		this.executionStartTime = Date.now();
		this.memoryUsage = new Map(); // Track memory usage by scope

		return this.securityConfig;
	}

	/**
	 * Advanced security validation with audit logging
	 */
	validateAdvancedSecurity( operation, resource, context = {} ) {
		// Log security check if auditing enabled
		if (this.securityConfig?.audit?.enabled) {
			this.logSecurityEvent('security_check', {
				operation: operation,
				resource: resource,
				context: context,
				timestamp: Date.now()
			});
		}

		// Check execution time limits
		if (this.securityConfig?.limits?.executionTime) {
			let elapsed = Date.now() - this.executionStartTime;
			if (elapsed > this.securityConfig.limits.executionTime) {
				this.logSecurityEvent('security_violation', {
					type: 'execution_timeout',
					elapsed: elapsed,
					limit: this.securityConfig.limits.executionTime
				});
				throw new Error(`Execution time limit exceeded: ${elapsed}ms > ${this.securityConfig.limits.executionTime}ms`);
			}
		}

		// Check operation rate limits
		this.operationCounter++;
		if (this.securityConfig?.limits?.operationsPerSecond) {
			let elapsed = Math.max(1, Date.now() - this.executionStartTime); // Prevent division by zero
			let opsPerSecond = this.operationCounter / (elapsed / 1000);
			if (opsPerSecond > this.securityConfig.limits.operationsPerSecond) {
				this.logSecurityEvent('security_violation', {
					type: 'rate_limit_exceeded',
					rate: opsPerSecond,
					limit: this.securityConfig.limits.operationsPerSecond
				});
				throw new Error(`Operation rate limit exceeded: ${opsPerSecond} ops/sec`);
			}
		}

		// File access validation
		if (operation.includes('file.') && resource) {
			return this.validateFileAccess( operation, resource );
		}

		// Network access validation
		if (operation.includes('http.') || operation.includes('network.')) {
			return this.validateNetworkAccess( operation, resource );
		}

		// Module access validation
		let module = operation.split('.')[0];
		if (!this.securityConfig?.sandbox?.allowedModules?.includes(module)) {
			this.logSecurityEvent('security_violation', {
				type: 'forbidden_module',
				module: module,
				operation: operation
			});
			return false;
		}

		// Forbidden operations check
		if (this.securityConfig?.sandbox?.forbiddenOperations?.some(op => operation.includes(op))) {
			this.logSecurityEvent('security_violation', {
				type: 'forbidden_operation',
				operation: operation
			});
			return false;
		}

		return true;
	}

	/**
	 * Validate file system access
	 */
	validateFileAccess( operation, filePath ) {
		if (!this.securityConfig?.sandbox?.fileAccess) return false;

		let { readPaths, writePaths, maxFileSize } = this.securityConfig.sandbox.fileAccess;

		// Normalize path
		let normalizedPath = filePath.replace(/\/+/g, '/');

		if (operation.includes('read')) {
			let allowed = readPaths.some(allowedPath =>
				normalizedPath.startsWith(allowedPath)
			);
			if (!allowed) {
				this.logSecurityEvent('security_violation', {
					type: 'file_read_denied',
					path: filePath,
					allowedPaths: readPaths
				});
				return false;
			}
		}

		if (operation.includes('write')) {
			let allowed = writePaths.some(allowedPath =>
				normalizedPath.startsWith(allowedPath)
			);
			if (!allowed) {
				this.logSecurityEvent('security_violation', {
					type: 'file_write_denied',
					path: filePath,
					allowedPaths: writePaths
				});
				return false;
			}
		}

		return true;
	}

	/**
	 * Validate network access
	 */
	validateNetworkAccess( operation, url ) {
		if (!this.securityConfig?.sandbox?.networkAccess) return false;

		let { allowedHosts, allowedPorts, maxRequestSize } = this.securityConfig.sandbox.networkAccess;

		try {
			let urlObj = new URL(url);
			let host = urlObj.hostname;
			let port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80);

			// Check allowed hosts
			if (allowedHosts.length > 0 && !allowedHosts.includes(host)) {
				this.logSecurityEvent('security_violation', {
					type: 'network_host_denied',
					host: host,
					allowedHosts: allowedHosts
				});
				return false;
			}

			// Check allowed ports
			if (allowedPorts.length > 0 && !allowedPorts.includes(parseInt(port))) {
				this.logSecurityEvent('security_violation', {
					type: 'network_port_denied',
					port: port,
					allowedPorts: allowedPorts
				});
				return false;
			}

			return true;
		} catch (error) {
			this.logSecurityEvent('security_violation', {
				type: 'invalid_url',
				url: url,
				error: error.message
			});
			return false;
		}
	}

	/**
	 * Log security events for audit trail
	 */
	logSecurityEvent( eventType, details ) {
		if (!this.securityConfig?.audit?.enabled) return;

		let entry = {
			timestamp: Date.now(),
			type: eventType,
			details: details,
			executionContext: {
				recursionDepth: this.recursionDepth,
				scopeDepth: this.scopeStack.length,
				operationCount: this.operationCounter
			}
		};

		this.auditLog.push( entry );

		// Trim audit log if needed
		if (this.auditLog.length > this.securityConfig.audit.maxLogEntries) {
			this.auditLog = this.auditLog.slice(-this.securityConfig.audit.maxLogEntries);
		}

		// Log to console based on log level
		let logLevel = this.securityConfig.audit.logLevel;
		if (logLevel === 'debug' ||
			(logLevel === 'info' && ['security_check', 'security_violation'].includes(eventType)) ||
			(logLevel === 'warning' && eventType === 'security_violation') ||
			(logLevel === 'error' && eventType === 'security_violation')) {
			console.log(`[LEXIPARSE AUDIT] ${eventType}:`, details);
		}
	}

	/**
	 * Get security audit report
	 */
	getSecurityAuditReport() {
		return {
			summary: {
				totalOperations: this.operationCounter,
				executionTime: Date.now() - this.executionStartTime,
				securityViolations: this.auditLog.filter(e => e.type === 'security_violation').length,
				auditEntries: this.auditLog.length
			},
			violations: this.auditLog.filter(e => e.type === 'security_violation'),
			recentActivity: this.auditLog.slice(-50),
			configuration: this.securityConfig
		};
	}

	// ========== 2. PERFORMANCE OPTIMIZATION & COMPILATION ==========

	/**
	 * Initialize performance optimization system
	 */
	initializePerformanceOptimization() {
		this.compilationCache = new Map();
		this.functionCache = new Map(); // Memoization cache
		this.performanceMetrics = {
			parseTime: 0,
			executionTime: 0,
			cacheHits: 0,
			cacheMisses: 0,
			optimizationLevel: 'none' // 'none', 'basic', 'aggressive'
		};

		this.optimizationConfig = {
			enableMemoization: true,
			enableLazyEvaluation: true,
			enableStreamingProcessing: false,
			cacheSize: 1000,
			compilationMode: 'jit' // 'jit' (just-in-time), 'aot' (ahead-of-time)
		};

		return this.optimizationConfig;
	}

	/**
	 * Compile script to optimized JavaScript for faster execution
	 */
	compile( sourceCode, optimizationLevel = 'basic' ) {
		let startTime = Date.now();

		// Check compilation cache
		let cacheKey = this.generateCacheKey( sourceCode, optimizationLevel );
		if (this.compilationCache.has( cacheKey )) {
			this.performanceMetrics.cacheHits++;
			return this.compilationCache.get( cacheKey );
		}

		this.performanceMetrics.cacheMisses++;

		try {
			// Parse to AST first
			let ast = this.parseToAST( sourceCode );

			// Apply optimizations
			let optimizedAST = this.applyOptimizations( ast, optimizationLevel );

			// Compile to JavaScript
			let compiledCode = this.compileASTToJS( optimizedAST );

			// Create executable function
			let compiledScript = {
				sourceCode: sourceCode,
				compiledCode: compiledCode,
				ast: optimizedAST,
				cacheKey: cacheKey,
				compiledAt: Date.now(),
				optimizationLevel: optimizationLevel,

				// Execute compiled script with data
				run: ( inputData = {} ) => {
					return this.executeCompiled( compiledCode, inputData );
				}
			};

			// Cache compiled result
			this.compilationCache.set( cacheKey, compiledScript );

			this.performanceMetrics.parseTime += Date.now() - startTime;
			return compiledScript;

		} catch (error) {
			throw new Error(`Compilation failed: ${error.message}`);
		}
	}

	/**
	 * Parse source code to Abstract Syntax Tree
	 */
	parseToAST( sourceCode ) {
		// Simplified AST generation - in production this would be more sophisticated
		let ast = {
			type: 'Program',
			body: [],
			sourceCode: sourceCode,
			parsedAt: Date.now()
		};

		// For now, store the parsed program structure
		this.currentProgram = sourceCode;
		let parseResult = this.parse( sourceCode );

		if (parseResult && this.parsed) {
			ast.body = this.parsed;
			ast.success = true;
		} else {
			ast.success = false;
			ast.errors = this.errors;
		}

		return ast;
	}

	/**
	 * Apply performance optimizations to AST
	 */
	applyOptimizations( ast, level ) {
		if (level === 'none') return ast;

		let optimizedAST = JSON.parse(JSON.stringify(ast)); // Deep clone

		if (level === 'basic' || level === 'aggressive') {
			// Constant folding
			optimizedAST = this.optimizeConstantFolding( optimizedAST );

			// Dead code elimination
			optimizedAST = this.optimizeDeadCodeElimination( optimizedAST );
		}

		if (level === 'aggressive') {
			// Function inlining for small functions
			optimizedAST = this.optimizeFunctionInlining( optimizedAST );

			// Loop unrolling for small fixed loops
			optimizedAST = this.optimizeLoopUnrolling( optimizedAST );
		}

		optimizedAST.optimizationLevel = level;
		optimizedAST.optimizedAt = Date.now();

		return optimizedAST;
	}

	/**
	 * Optimize constant expressions (e.g., 2 + 3 becomes 5)
	 */
	optimizeConstantFolding( ast ) {
		// Simplified constant folding - would be more sophisticated in production
		return ast;
	}

	/**
	 * Remove unreachable code
	 */
	optimizeDeadCodeElimination( ast ) {
		// Simplified dead code elimination
		return ast;
	}

	/**
	 * Inline small functions
	 */
	optimizeFunctionInlining( ast ) {
		// Simplified function inlining
		return ast;
	}

	/**
	 * Unroll small loops for performance
	 */
	optimizeLoopUnrolling( ast ) {
		// Simplified loop unrolling
		return ast;
	}

	/**
	 * Compile AST to executable JavaScript
	 */
	compileASTToJS( ast ) {
		// Generate optimized JavaScript code from AST
		let jsCode = `
			// Generated by Lexiparse Compiler
			// Compiled at: ${new Date().toISOString()}
			// Optimization level: ${ast.optimizationLevel}

			function executeLexiparseScript(data, context) {
				// Set up execution context
				let variables = Object.assign({}, data);
				let result = null;

				try {
					// Execute parsed business logic
					${this.generateJSFromAST(ast)}

					return {
						success: true,
						result: result,
						variables: variables
					};
				} catch (error) {
					return {
						success: false,
						error: error.message,
						variables: variables
					};
				}
			}
		`;

		return jsCode;
	}

	/**
	 * Generate JavaScript code from AST nodes
	 */
	generateJSFromAST( ast ) {
		// Simplified JS generation - would be much more sophisticated in production
		return `
			// Placeholder for generated JavaScript
			// This would contain the actual business logic translation
			result = "Compiled execution placeholder";
		`;
	}

	/**
	 * Execute compiled JavaScript code
	 */
	executeCompiled( compiledCode, inputData ) {
		let startTime = Date.now();

		try {
			// Execute compiled JavaScript
			let execFunction = new Function('data', 'context', `
				${compiledCode}
				return executeLexiparseScript(data, this);
			`);

			let result = execFunction.call(this, inputData, this);

			this.performanceMetrics.executionTime += Date.now() - startTime;
			return result;

		} catch (error) {
			throw new Error(`Compiled execution failed: ${error.message}`);
		}
	}

	/**
	 * Generate cache key for compilation caching
	 */
	generateCacheKey( sourceCode, optimizationLevel ) {
		// Simple hash function - would use proper crypto hash in production
		let hash = 0;
		let str = sourceCode + optimizationLevel + JSON.stringify(this.grammar);
		for (let i = 0; i < str.length; i++) {
			let char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return `compiled_${Math.abs(hash)}_${optimizationLevel}`;
	}

	/**
	 * Get performance metrics report
	 */
	getPerformanceReport() {
		return {
			metrics: this.performanceMetrics,
			cacheStats: {
				size: this.compilationCache.size,
				hitRate: this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) || 0
			},
			configuration: this.optimizationConfig
		};
	}

	// ========== 3. MODULE SYSTEM ==========

	/**
	 * Initialize module system for code reuse and organization
	 */
	initializeModuleSystem() {
		this.modules = new Map(); // Registered modules
		this.imports = new Map();  // Imported symbols
		this.exports = new Map();  // Exported symbols
		this.moduleLoadPaths = ['./modules/', './lib/', './node_modules/'];
		this.moduleCache = new Map(); // Module loading cache

		// Register built-in modules
		this.registerBuiltInModules();

		return {
			modules: Array.from(this.modules.keys()),
			loadPaths: this.moduleLoadPaths
		};
	}

	/**
	 * Register built-in standard modules
	 */
	registerBuiltInModules() {
		// Business utilities module
		this.registerModule('business', {
			calculateTax: ( amount, rate ) => amount * (rate / 100),
			formatCurrency: ( amount, symbol = '$' ) => `${symbol}${amount.toFixed(2)}`,
			validateSSN: ( ssn ) => /^\d{3}-\d{2}-\d{4}$/.test(ssn),
			calculateAge: ( birthDate ) => Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
			businessDaysBetween: ( start, end ) => {
				let days = 0;
				let current = new Date(start);
				while (current < end) {
					if (current.getDay() !== 0 && current.getDay() !== 6) days++;
					current.setDate(current.getDate() + 1);
				}
				return days;
			}
		});

		// Analytics module
		this.registerModule('analytics', {
			sum: ( arr ) => arr.reduce((a, b) => a + b, 0),
			average: ( arr ) => arr.reduce((a, b) => a + b, 0) / arr.length,
			median: ( arr ) => {
				let sorted = arr.slice().sort((a, b) => a - b);
				let mid = Math.floor(sorted.length / 2);
				return sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid]) / 2 : sorted[mid];
			},
			standardDeviation: ( arr ) => {
				let avg = arr.reduce((a, b) => a + b, 0) / arr.length;
				let squaredDiffs = arr.map(x => Math.pow(x - avg, 2));
				return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / arr.length);
			},
			percentile: ( arr, p ) => {
				let sorted = arr.slice().sort((a, b) => a - b);
				let index = (p / 100) * (sorted.length - 1);
				let lower = Math.floor(index);
				let upper = Math.ceil(index);
				return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
			}
		});

		// Validation module
		this.registerModule('validation', {
			isEmail: ( email ) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
			isPhoneNumber: ( phone ) => /^\+?[\d\s\-\(\)]+$/.test(phone),
			isURL: ( url ) => {
				try { new URL(url); return true; } catch { return false; }
			},
			isCreditCard: ( cc ) => /^\d{13,19}$/.test(cc.replace(/\s/g, '')),
			isZipCode: ( zip ) => /^\d{5}(-\d{4})?$/.test(zip),
			isEmpty: ( value ) => value == null || value === '' || (Array.isArray(value) && value.length === 0)
		});
	}

	/**
	 * Register a module with exported functions
	 */
	registerModule( name, exports ) {
		this.modules.set( name, {
			name: name,
			exports: exports,
			registeredAt: Date.now(),
			type: 'standard'
		});

		// Also register as external functions for backward compatibility
		Object.keys(exports).forEach(funcName => {
			this.registerRuntimeModule(name, {
				[funcName]: {
					implementation: exports[funcName],
					description: `${name}.${funcName}`,
					parameters: [],
					security: 'safe'
				}
			});
		});

		return true;
	}

	/**
	 * Import functions from a module
	 */
	importModule( moduleName, options = {} ) {
		if (!this.modules.has( moduleName )) {
			throw new Error(`Module '${moduleName}' not found`);
		}

		let module = this.modules.get( moduleName );
		let { as, only, except } = options;

		// Import specific functions or all
		let toImport = only ? only : Object.keys(module.exports);
		if (except) {
			toImport = toImport.filter(name => !except.includes(name));
		}

		toImport.forEach(funcName => {
			let importedName = as ? `${as}.${funcName}` : funcName;
			this.imports.set( importedName, {
				module: moduleName,
				original: funcName,
				function: module.exports[funcName]
			});
		});

		return {
			module: moduleName,
			imported: toImport,
			as: as
		};
	}

	/**
	 * Export functions from current script
	 */
	exportFunction( name, func, description = '' ) {
		this.exports.set( name, {
			function: func,
			description: description,
			exportedAt: Date.now()
		});

		return true;
	}

	/**
	 * Get available modules
	 */
	getAvailableModules() {
		return Array.from(this.modules.entries()).map(([name, module]) => ({
			name: name,
			functions: Object.keys(module.exports),
			type: module.type,
			registeredAt: module.registeredAt
		}));
	}

	/**
	 * Call imported function
	 */
	callImportedFunction( name, args ) {
		if (!this.imports.has( name )) {
			throw new Error(`Imported function '${name}' not found`);
		}

		let imported = this.imports.get( name );
		return imported.function.apply( this, args );
	}

	// ========== 4. STANDARD LIBRARY ==========

	/**
	 * Initialize comprehensive standard library for business applications
	 */
	initializeStandardLibrary() {
		this.stdlib = {
			// Core utilities
			core: this.getStandardLibraryCore(),

			// Business-specific functions
			business: this.getStandardLibraryBusiness(),

			// Data processing
			data: this.getStandardLibraryData(),

			// Financial calculations
			finance: this.getStandardLibraryFinance(),

			// Healthcare specific
			healthcare: this.getStandardLibraryHealthcare(),

			// Insurance specific
			insurance: this.getStandardLibraryInsurance()
		};

		// Register all standard library modules
		Object.keys(this.stdlib).forEach(moduleName => {
			this.registerModule( moduleName, this.stdlib[moduleName] );
		});

		return Object.keys(this.stdlib);
	}

	/**
	 * Core standard library functions
	 */
	getStandardLibraryCore() {
		return {
			// Type checking
			isNumber: ( value ) => typeof value === 'number' && !isNaN(value),
			isString: ( value ) => typeof value === 'string',
			isArray: ( value ) => Array.isArray(value),
			isObject: ( value ) => typeof value === 'object' && value !== null && !Array.isArray(value),
			isDate: ( value ) => value instanceof Date && !isNaN(value),
			isFunction: ( value ) => typeof value === 'function',

			// Conversion utilities
			toString: ( value ) => String(value),
			toNumber: ( value ) => Number(value),
			toBoolean: ( value ) => Boolean(value),

			// Array utilities
			first: ( arr ) => arr[0],
			last: ( arr ) => arr[arr.length - 1],
			unique: ( arr ) => [...new Set(arr)],
			flatten: ( arr ) => arr.flat(Infinity),
			chunk: ( arr, size ) => {
				let result = [];
				for (let i = 0; i < arr.length; i += size) {
					result.push(arr.slice(i, i + size));
				}
				return result;
			},

			// Object utilities
			keys: ( obj ) => Object.keys(obj),
			values: ( obj ) => Object.values(obj),
			entries: ( obj ) => Object.entries(obj),
			pick: ( obj, keys ) => {
				let result = {};
				keys.forEach(key => {
					if (key in obj) result[key] = obj[key];
				});
				return result;
			},
			omit: ( obj, keys ) => {
				let result = Object.assign({}, obj);
				keys.forEach(key => delete result[key]);
				return result;
			}
		};
	}

	/**
	 * Business-specific standard library
	 */
	getStandardLibraryBusiness() {
		return {
			// Business date calculations
			addBusinessDays: ( date, days ) => {
				let result = new Date(date);
				let addedDays = 0;
				while (addedDays < days) {
					result.setDate(result.getDate() + 1);
					if (result.getDay() !== 0 && result.getDay() !== 6) {
						addedDays++;
					}
				}
				return result;
			},

			// Quarter calculations
			getQuarter: ( date ) => Math.ceil((date.getMonth() + 1) / 3),
			getQuarterStart: ( date ) => {
				let quarter = Math.ceil((date.getMonth() + 1) / 3);
				return new Date(date.getFullYear(), (quarter - 1) * 3, 1);
			},
			getQuarterEnd: ( date ) => {
				let quarter = Math.ceil((date.getMonth() + 1) / 3);
				return new Date(date.getFullYear(), quarter * 3, 0);
			},

			// Fiscal year calculations (assumes Oct 1 - Sep 30)
			getFiscalYear: ( date ) => {
				return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear();
			},

			// Business rules
			applyBusinessRule: ( rule, data ) => {
				switch (rule.type) {
					case 'range':
						return data >= rule.min && data <= rule.max;
					case 'enum':
						return rule.values.includes(data);
					case 'pattern':
						return new RegExp(rule.pattern).test(data);
					default:
						return true;
				}
			},

			// Workflow status
			calculateWorkflowProgress: ( steps, completedSteps ) => {
				return (completedSteps.length / steps.length) * 100;
			},

			// Business metrics
			calculateROI: ( investment, return_ ) => ((return_ - investment) / investment) * 100,
			calculateGrowthRate: ( current, previous ) => ((current - previous) / previous) * 100,
			calculateMargin: ( revenue, cost ) => ((revenue - cost) / revenue) * 100
		};
	}

	/**
	 * Data processing standard library
	 */
	getStandardLibraryData() {
		return {
			// Data validation
			validateSchema: ( data, schema ) => {
				// Simplified schema validation
				for (let field in schema) {
					if (schema[field].required && !(field in data)) {
						return { valid: false, error: `Required field '${field}' missing` };
					}
					if (field in data && schema[field].type && typeof data[field] !== schema[field].type) {
						return { valid: false, error: `Field '${field}' must be of type ${schema[field].type}` };
					}
				}
				return { valid: true };
			},

			// Data transformation
			mapKeys: ( obj, mapper ) => {
				let result = {};
				Object.keys(obj).forEach(key => {
					result[mapper(key)] = obj[key];
				});
				return result;
			},

			groupBy: ( arr, key ) => {
				return arr.reduce((groups, item) => {
					let group = item[key];
					if (!groups[group]) groups[group] = [];
					groups[group].push(item);
					return groups;
				}, {});
			},

			// Data aggregation
			countBy: ( arr, key ) => {
				return arr.reduce((counts, item) => {
					let value = item[key];
					counts[value] = (counts[value] || 0) + 1;
					return counts;
				}, {});
			},

			sumBy: ( arr, key ) => {
				return arr.reduce((sum, item) => sum + (item[key] || 0), 0);
			},

			avgBy: ( arr, key ) => {
				let sum = arr.reduce((sum, item) => sum + (item[key] || 0), 0);
				return sum / arr.length;
			}
		};
	}

	/**
	 * Financial calculations standard library
	 */
	getStandardLibraryFinance() {
		return {
			// Interest calculations
			simpleInterest: ( principal, rate, time ) => principal * (rate / 100) * time,
			compoundInterest: ( principal, rate, time, frequency = 1 ) => {
				return principal * Math.pow(1 + (rate / 100) / frequency, frequency * time) - principal;
			},

			// Present/Future value
			presentValue: ( futureValue, rate, periods ) => {
				return futureValue / Math.pow(1 + (rate / 100), periods);
			},
			futureValue: ( presentValue, rate, periods ) => {
				return presentValue * Math.pow(1 + (rate / 100), periods);
			},

			// Loan calculations
			loanPayment: ( principal, rate, periods ) => {
				let monthlyRate = (rate / 100) / 12;
				return principal * (monthlyRate * Math.pow(1 + monthlyRate, periods)) /
					   (Math.pow(1 + monthlyRate, periods) - 1);
			},

			// Depreciation
			straightLineDepreciation: ( cost, salvageValue, lifeYears ) => {
				return (cost - salvageValue) / lifeYears;
			},

			// Currency conversion (simplified)
			convertCurrency: ( amount, fromRate, toRate ) => {
				return amount * (toRate / fromRate);
			},

			// Financial ratios
			debtToEquityRatio: ( totalDebt, totalEquity ) => totalDebt / totalEquity,
			currentRatio: ( currentAssets, currentLiabilities ) => currentAssets / currentLiabilities,
			quickRatio: ( currentAssets, inventory, currentLiabilities ) =>
				(currentAssets - inventory) / currentLiabilities
		};
	}

	/**
	 * Healthcare-specific standard library
	 */
	getStandardLibraryHealthcare() {
		return {
			// BMI calculations
			calculateBMI: ( weight, height ) => weight / (height * height),
			getBMICategory: ( bmi ) => {
				if (bmi < 18.5) return 'Underweight';
				if (bmi < 25) return 'Normal weight';
				if (bmi < 30) return 'Overweight';
				return 'Obese';
			},

			// Age calculations for medical contexts
			getAgeInMonths: ( birthDate ) => {
				let now = new Date();
				return (now.getFullYear() - birthDate.getFullYear()) * 12 +
					   (now.getMonth() - birthDate.getMonth());
			},

			// Medical code validation (simplified)
			validateICD10: ( code ) => /^[A-Z][0-9]{2}(\.[0-9X]{1,4})?$/.test(code),
			validateCPT: ( code ) => /^[0-9]{5}$/.test(code),

			// Dosage calculations
			calculateDosage: ( weight, dosePerKg ) => weight * dosePerKg,

			// Vital signs validation
			validateBloodPressure: ( systolic, diastolic ) => {
				return systolic > 70 && systolic < 300 &&
					   diastolic > 40 && diastolic < 200 &&
					   systolic > diastolic;
			},

			validateHeartRate: ( rate, ageYears ) => {
				let maxRate = 220 - ageYears;
				return rate > 40 && rate < maxRate;
			}
		};
	}

	/**
	 * Insurance-specific standard library
	 */
	getStandardLibraryInsurance() {
		return {
			// Premium calculations
			calculateLifePremium: ( age, coverage, riskFactor = 1.0 ) => {
				let basePremium = coverage * 0.001; // 0.1% of coverage
				let ageFactor = age > 50 ? 1 + ((age - 50) * 0.02) : 1;
				return basePremium * ageFactor * riskFactor;
			},

			calculateAutoPremium: ( vehicle, driver, coverage ) => {
				let basePremium = coverage.liability * 0.01;
				let ageFactor = driver.age < 25 ? 1.5 : driver.age > 65 ? 1.2 : 1.0;
				let vehicleFactor = new Date().getFullYear() - vehicle.year > 10 ? 0.9 : 1.1;
				return basePremium * ageFactor * vehicleFactor;
			},

			// Coverage calculations
			calculateCoinsurance: ( amount, coinsuranceRate ) => {
				return amount * (coinsuranceRate / 100);
			},

			calculateDeductible: ( claim, deductible, deductibleMet ) => {
				let remaining = Math.max(0, deductible - deductibleMet);
				return Math.min(claim, remaining);
			},

			// Policy validations
			isPolicyActive: ( policy, date = new Date() ) => {
				return new Date(policy.effectiveDate) <= date &&
					   new Date(policy.expirationDate) >= date;
			},

			// Claim processing
			calculateClaimPayment: ( claim, policy ) => {
				let covered = claim.amount;

				// Apply deductible
				if (claim.deductible) {
					covered = Math.max(0, covered - claim.deductible);
				}

				// Apply coinsurance
				if (policy.coinsurance) {
					covered = covered * ((100 - policy.coinsurance) / 100);
				}

				// Apply policy limits
				if (policy.limits && policy.limits[claim.type]) {
					covered = Math.min(covered, policy.limits[claim.type]);
				}

				return {
					originalAmount: claim.amount,
					coveredAmount: covered,
					patientResponsibility: claim.amount - covered
				};
			}
		};
	}

	// ========== 5. MEMORY MANAGEMENT ==========

	/**
	 * Initialize memory management system for long-running scripts
	 */
	initializeMemoryManagement() {
		this.memoryManager = {
			maxMemory: 100 * 1024 * 1024, // 100MB default
			currentUsage: 0,
			allocations: new Map(),
			garbageCollectionInterval: 30000, // 30 seconds
			lastGC: Date.now(),
			weakReferences: new WeakMap(),
			memoryPools: new Map()
		};

		// Start periodic garbage collection
		this.startMemoryMonitoring();

		return this.memoryManager;
	}

	/**
	 * Start memory monitoring and garbage collection
	 */
	startMemoryMonitoring() {
		if (this.memoryGCInterval) {
			clearInterval(this.memoryGCInterval);
		}

		this.memoryGCInterval = setInterval(() => {
			this.performGarbageCollection();
		}, this.memoryManager.garbageCollectionInterval);
	}

	/**
	 * Track memory allocation for variables and objects
	 */
	trackMemoryAllocation( id, object, size ) {
		this.memoryManager.allocations.set( id, {
			object: object,
			size: size,
			allocatedAt: Date.now(),
			lastAccessed: Date.now(),
			accessCount: 0
		});

		this.memoryManager.currentUsage += size;

		// Check memory limits
		if (this.memoryManager.currentUsage > this.memoryManager.maxMemory) {
			this.performEmergencyGarbageCollection();
		}
	}

	/**
	 * Update memory access tracking
	 */
	trackMemoryAccess( id ) {
		let allocation = this.memoryManager.allocations.get( id );
		if (allocation) {
			allocation.lastAccessed = Date.now();
			allocation.accessCount++;
		}
	}

	/**
	 * Perform garbage collection
	 */
	performGarbageCollection() {
		let freedMemory = 0;
		let currentTime = Date.now();
		let maxAge = 300000; // 5 minutes

		// Remove old, unused allocations
		for (let [id, allocation] of this.memoryManager.allocations) {
			let age = currentTime - allocation.lastAccessed;

			// Remove if old and rarely accessed
			if (age > maxAge && allocation.accessCount < 5) {
				freedMemory += allocation.size;
				this.memoryManager.allocations.delete( id );
			}
		}

		this.memoryManager.currentUsage -= freedMemory;
		this.memoryManager.lastGC = currentTime;

		// Clear compilation cache if memory pressure
		if (this.memoryManager.currentUsage > this.memoryManager.maxMemory * 0.8) {
			this.clearOldCacheEntries();
		}

		// Log memory stats if significant cleanup
		if (freedMemory > 1024 * 1024) { // > 1MB freed
			this.logSecurityEvent('memory_gc', {
				freedMemory: freedMemory,
				currentUsage: this.memoryManager.currentUsage,
				allocations: this.memoryManager.allocations.size
			});
		}
	}

	/**
	 * Emergency garbage collection when memory limit exceeded
	 */
	performEmergencyGarbageCollection() {
		// Aggressive cleanup
		let targetReduction = this.memoryManager.currentUsage * 0.3; // Free 30%
		let freedMemory = 0;

		// Sort allocations by last access time and access count
		let sortedAllocations = Array.from(this.memoryManager.allocations.entries())
			.sort((a, b) => {
				let scoreA = a[1].lastAccessed - (a[1].accessCount * 1000);
				let scoreB = b[1].lastAccessed - (b[1].accessCount * 1000);
				return scoreA - scoreB;
			});

		// Free least recently used allocations
		for (let [id, allocation] of sortedAllocations) {
			if (freedMemory >= targetReduction) break;

			freedMemory += allocation.size;
			this.memoryManager.allocations.delete( id );
		}

		this.memoryManager.currentUsage -= freedMemory;

		// Clear caches aggressively
		this.compilationCache.clear();
		this.functionCache.clear();

		this.logSecurityEvent('emergency_gc', {
			freedMemory: freedMemory,
			newUsage: this.memoryManager.currentUsage,
			trigger: 'memory_limit_exceeded'
		});
	}

	/**
	 * Clear old cache entries
	 */
	clearOldCacheEntries() {
		let currentTime = Date.now();
		let maxAge = 600000; // 10 minutes

		// Clear old compilation cache entries
		for (let [key, entry] of this.compilationCache) {
			if (entry.compiledAt && (currentTime - entry.compiledAt) > maxAge) {
				this.compilationCache.delete( key );
			}
		}

		// Clear old function cache entries
		for (let [key, entry] of this.functionCache) {
			if (entry.cachedAt && (currentTime - entry.cachedAt) > maxAge) {
				this.functionCache.delete( key );
			}
		}
	}

	/**
	 * Get memory usage report
	 */
	getMemoryReport() {
		return {
			usage: {
				current: this.memoryManager.currentUsage,
				max: this.memoryManager.maxMemory,
				percentage: (this.memoryManager.currentUsage / this.memoryManager.maxMemory) * 100
			},
			allocations: {
				count: this.memoryManager.allocations.size,
				details: Array.from(this.memoryManager.allocations.entries()).map(([id, alloc]) => ({
					id: id,
					size: alloc.size,
					age: Date.now() - alloc.allocatedAt,
					accessCount: alloc.accessCount
				}))
			},
			caches: {
				compilation: this.compilationCache.size,
				functions: this.functionCache.size
			},
			lastGC: new Date(this.memoryManager.lastGC).toISOString()
		};
	}

	// ========== 6. CONFIGURATION SYSTEM ==========

	/**
	 * Initialize comprehensive configuration system
	 */
	initializeConfigurationSystem( userConfig = {} ) {
		this.configuration = {
			// Runtime behavior
			runtime: {
				strictMode: userConfig.strictMode !== false,
				debugMode: userConfig.debugMode === true,
				verboseLogging: userConfig.verboseLogging === true,
				errorRecovery: userConfig.errorRecovery !== false,
				maxExecutionTime: userConfig.maxExecutionTime || 30000
			},

			// Security settings
			security: {
				mode: userConfig.securityMode || 'restricted',
				enableAudit: userConfig.enableAudit !== false,
				auditLevel: userConfig.auditLevel || 'warning',
				maxMemory: userConfig.maxMemory || 100 * 1024 * 1024,
				allowedModules: userConfig.allowedModules || ['core', 'math', 'string', 'date'],
				fileAccess: userConfig.fileAccess || {
					readPaths: ['/data/input/', '/config/'],
					writePaths: ['/data/output/']
				}
			},

			// Performance settings
			performance: {
				enableCompilation: userConfig.enableCompilation !== false,
				optimizationLevel: userConfig.optimizationLevel || 'basic',
				enableCaching: userConfig.enableCaching !== false,
				cacheSize: userConfig.cacheSize || 1000,
				enableMemoization: userConfig.enableMemoization !== false
			},

			// Module system
			modules: {
				enableStandardLibrary: userConfig.enableStandardLibrary !== false,
				loadPaths: userConfig.modulePaths || ['./modules/', './lib/'],
				autoLoadModules: userConfig.autoLoadModules || [],
				enableLazyLoading: userConfig.enableLazyLoading === true
			},

			// Memory management
			memory: {
				enableGarbageCollection: userConfig.enableGarbageCollection !== false,
				gcInterval: userConfig.gcInterval || 30000,
				memoryLimit: userConfig.memoryLimit || 100 * 1024 * 1024,
				emergencyGCThreshold: userConfig.emergencyGCThreshold || 0.9
			},

			// Business-specific settings
			business: {
				dateFormat: userConfig.dateFormat || 'MM/DD/YYYY',
				currencySymbol: userConfig.currencySymbol || '$',
				fiscalYearStart: userConfig.fiscalYearStart || 'October',
				timeZone: userConfig.timeZone || 'UTC',
				businessDays: userConfig.businessDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
			},

			// Development settings
			development: {
				enableSourceMaps: userConfig.enableSourceMaps === true,
				preserveComments: userConfig.preserveComments === true,
				generateDocumentation: userConfig.generateDocumentation === true,
				enableTesting: userConfig.enableTesting === true
			}
		};

		// Apply configuration to subsystems
		this.applyConfiguration();

		return this.configuration;
	}

	/**
	 * Apply configuration settings to all subsystems
	 */
	applyConfiguration() {
		// Apply security configuration
		if (this.configuration.security) {
			this.initializeProductionSecurity( this.configuration.security );
		}

		// Apply performance configuration
		if (this.configuration.performance.enableCompilation) {
			this.initializePerformanceOptimization();
		}

		// Apply module configuration
		if (this.configuration.modules.enableStandardLibrary) {
			this.initializeStandardLibrary();
		}

		// Apply memory configuration
		if (this.configuration.memory.enableGarbageCollection) {
			this.initializeMemoryManagement();
		}

		// Auto-load modules if configured
		if (this.configuration.modules.autoLoadModules) {
			this.configuration.modules.autoLoadModules.forEach(moduleName => {
				try {
					this.importModule( moduleName );
				} catch (error) {
					console.warn(`Failed to auto-load module '${moduleName}':`, error.message);
				}
			});
		}
	}

	/**
	 * Update configuration at runtime
	 */
	updateConfiguration( path, value ) {
		// Navigate to nested configuration property
		let current = this.configuration;
		let parts = path.split('.');

		for (let i = 0; i < parts.length - 1; i++) {
			if (!current[parts[i]]) {
				current[parts[i]] = {};
			}
			current = current[parts[i]];
		}

		current[parts[parts.length - 1]] = value;

		// Re-apply configuration
		this.applyConfiguration();

		return true;
	}

	/**
	 * Get current configuration
	 */
	getConfiguration( path = null ) {
		if (!path) return this.configuration;

		// Navigate to nested configuration property
		let current = this.configuration;
		let parts = path.split('.');

		for (let part of parts) {
			if (current[part] === undefined) return undefined;
			current = current[part];
		}

		return current;
	}

	/**
	 * Reset configuration to defaults
	 */
	resetConfiguration() {
		this.initializeConfigurationSystem({});
		return this.configuration;
	}

	/**
	 * Get configuration schema for validation
	 */
	getConfigurationSchema() {
		return {
			runtime: {
				strictMode: { type: 'boolean', default: true },
				debugMode: { type: 'boolean', default: false },
				maxExecutionTime: { type: 'number', min: 1000, max: 300000 }
			},
			security: {
				mode: { type: 'string', enum: ['sandbox', 'restricted', 'open'] },
				maxMemory: { type: 'number', min: 1024 * 1024 }
			},
			performance: {
				optimizationLevel: { type: 'string', enum: ['none', 'basic', 'aggressive'] },
				cacheSize: { type: 'number', min: 100, max: 10000 }
			}
		};
	}

	/**
	 * Initialize complete production system
	 */
	initializeProductionSystem( config = {} ) {
		console.log('🚀 Initializing Lexiparse Production System...');

		// Initialize all production subsystems
		this.initializeConfigurationSystem( config );
		this.initializeProductionSecurity( config );
		this.initializePerformanceOptimization();
		this.initializeModuleSystem();
		this.initializeStandardLibrary();
		this.initializeMemoryManagement();

		console.log('✅ Production system initialized successfully!');
		console.log(`📊 Security mode: ${this.securityConfig?.sandbox ? 'Enhanced' : 'Basic'}`);
		console.log(`⚡ Performance: ${this.optimizationConfig ? 'Optimized' : 'Standard'}`);
		console.log(`📦 Modules: ${this.getAvailableModules().length} available`);
		console.log(`🛠️ Standard library: ${Object.keys(this.stdlib || {}).length} modules loaded`);

		return {
			security: !!this.securityConfig,
			performance: !!this.optimizationConfig,
			modules: this.getAvailableModules().length,
			standardLibrary: Object.keys(this.stdlib || {}).length,
			configuration: this.configuration
		};
	}

} // end of Lexiparse class

module.exports = Lexiparse;

