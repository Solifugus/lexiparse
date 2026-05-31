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

	// Parse primary expressions (numbers, variables, parentheses, function calls)
	parsePrimaryExpression( code, pos ) {
		// Skip whitespace
		while( this.option.ignore.indexOf(code[pos]) !== -1 ) pos += 1;

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
			return inner;
		}

		// Try to match using existing grammar rules for primary expressions
		// This allows integration with existing lexiparse grammar
		for (let segmentName in this.grammar) {
			// Skip expression segments to avoid recursion
			if (segmentName === 'expr') continue;

			let match = this.matchOption( code, pos, segmentName );
			if (match !== false) {
				return match;
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

} // end of Lexiparse class

module.exports = Lexiparse;

