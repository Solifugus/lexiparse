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
		this.option = option;
	};  // End of constructor()

	// Sort segment options from longest to shortest
	presort() {
		// TODO
	}

	// Run Program
	run( program, pos = 0 ) {
		// Execute each statement in program
		this.finished = false;
		while( pos < program.length && !this.finished ) {
			var match = this.matchOption( program, pos, this.option.top );
			if( match === false ) {
				while( this.option.ignore.indexOf(program[pos]) !== -1 ) pos += 1; // skip passed any ignored characters
				let linePos = this.getLinePos( program, pos );
				console.error('Syntax Error on line #' + linePos.lineNo + ', position: ' +  linePos.charNo + '.');
				console.error('\t--> ' + program.substr(pos,linePos.endOfLine));
				break;
			}
			pos = match.posAfter;
		}
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
				throw 'ERROR in Callback Function for "' + label + '": ' + error.message;
			}
		}

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
                    throw 'ERROR in Sequence Callback: ' + error.message;
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
		// Parse left operand
		let left = this.parsePrimaryExpression( code, pos );
		if (!left) return false;

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
				throw `Expected right operand for operator '${operator.value}' at position ${pos}`;
			}

			pos = right.posAfter;

			// Create binary operation node
			left = this.createBinaryOperation( operator.value, left, right );
			left.posAfter = pos;
		}

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

} // end of Lexiparse class

module.exports = Lexiparse;

