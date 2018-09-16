
The Lexiparse class may be used to instantiate a combined lexical analyzer / 
parser generator for making programming language interpreters and/or 
compilters.

First you must:
	* Code your language's grammar definition (notation described later herein)
	* Include and instantiate an instance of the Lexiparse class, passing 
	  your grammar definition and any non-default options into the constructor.


The sample file "burp.js" illustrates with implementation of the "burp" language.

------------------
Grammar Definition

The grammar definition is a JavaScript object, such as the following
illustrative example:

	grammar = {
		'stmt':[
			['input',':var', getInput],
			['output',':expr', doOutput],
			['var','=',':expr', doAssignment]
		],
		'expr':[
			':numlit',
			':var',
			[':expr','+',':expr', doAddition],
			[':expr','+',':expr', doSubtraction],
			['(',':expr',')']
		],
		'var':[/^[A-Za-z][A-Za-z0-9]+/,getValue],
		'numlit':[/^[+-]?\d+(\.\d+)?/],
	}

	The 'stmt', 'expr', 'var', and 'numlit' elements are named grammar
segments.  Each holds an array of options, any of which will evaluate to
it.  These options may be strings, regular expressions, or sub-arrays 
(representing sequences).  Each works like this:

	String
		A string not starting with a colon is interpreted as a literal to match
in the program source code.  However, if the string begins with a colon (and
not a double-colon than the rest of the string is interpreted as the name of
a grammar segment.  For example, ':expr' means as defined under segment 'expr'.
However, '::expr' would mean the text literal '::expr'.  
 
	Regular Expression
		Regular expressions must always begin with a karat character ('^') but
are otherwise normal regular expressions to match against program source code.
It will extract exactly what the JavaScript Rexexp.exec() produces, so you may
make use of parenthesis, etc., as desired.

	Sequence
		If a segment option is an array itself, the elements of that array are
interpreted as required items in sequence.  Furthermore, the last element may
optionally be a function to preprocess the option's returned values.  For 
example, the 'stmt' segment has 3 sequences under it.  The 'expr' segment
has 5 options, the last 3 of which are sequences. 

-------------------
Constructor Options

	caseful
		This may be true (default) for case sensitivity or false for case 
		insensitivity.

	ignore
		This should hold an array of characters to ignore.  Usually, this will
		be the whitespace characters of your language.
		NOTE: In the future, I might want to add a way to specify ignored 
		characters for each named segment, individually.

	sequenceBlind (TODO: not yet implemeneted)
		If true, sequences will match if all elements exist in place, in order,
		but will ignore any extraneous elements before, after, or between.

	literalBlind (TODO: not yet implemented)
		If true, tolerate keyword mispellings where still recognizable.




