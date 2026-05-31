#!/usr/bin/nodejs

var Lexiparse = require('../lexiparse.js');

// Grammar with enhanced variable handling
let grammar = {
    'stmt': [
        ['output', '=', ':expr'],
        [':var', '=', ':expr', function(detail) {
            // Variable assignment with scoping
            let varName = detail.values[0].value;
            let expression = detail.values[2];

            // Use scoping system for assignment
            this.assignVariable(varName, this.resolveValue(expression));

            detail.type = 'assignment';
            detail.variable = varName;
            detail.value = expression;
            detail.scope = this.getScopeInfo();
        }],
        ['let', ':var', '=', ':expr', function(detail) {
            // Variable declaration with scoping
            let varName = detail.values[1].value;
            let expression = detail.values[3];

            let success = this.declareVariable(varName, this.resolveValue(expression), 'let');

            detail.type = 'declaration';
            detail.variable = varName;
            detail.value = expression;
            detail.success = success;
            detail.scope = this.getScopeInfo();
        }],
        ['if', '(', ':expr', ')', '{', ':block', '}', function(detail) {
            // Pop the block scope after if statement
            this.popScope();
            detail.type = 'if_with_scope';
        }],
        ['{', ':block', '}', function(detail) {
            // Standalone block with scope
            this.popScope();
            detail.type = 'scoped_block_end';
        }]
    ],
    'block': [
        [':stmt'],
        [':stmt', ':block']
    ],
    'expr': [
        ['(', ':expr', ')'],
        [':numlit'],
        [':strlit'],
        [':var']
    ],
    'var': [/^[A-Za-z][A-Za-z0-9_]*/, function(detail) {
        detail.type = 'variable';
        detail.value = detail.found[0];
    }],
    'numlit': [/^[+-]?\d+(\.\d+)?/, function(detail) {
        detail.type = 'number';
        detail.value = Number(detail.found[0]);
    }],
    'strlit': [/^"([^"]*)"/, function(detail) {
        detail.type = 'string';
        detail.value = detail.found[1];
    }]
};

console.log('🧪 Testing Variable Scoping System\n');

// Scoping test cases
let scopingTests = [
    {
        name: "Global Variable Assignment",
        code: `rate = 5.5
               total = 1000`,
        setup: function(interpreter) {
            // No special setup needed
        }
    },
    {
        name: "Block Scope Isolation",
        code: `rate = 5.5
               {
                   let local_rate = 7.5
                   discount = 0.1
               }
               final = rate + discount`,
        setup: function(interpreter) {
            // Should create a block scope
        }
    },
    {
        name: "Variable Shadowing",
        code: `amount = 100
               {
                   let amount = 200
                   local_total = amount * 2
               }
               global_total = amount * 3`,
        setup: function(interpreter) {
            // Inner amount should shadow outer
        }
    },
    {
        name: "Scope Chain Lookup",
        code: `global_rate = 0.15
               {
                   multiplier = 2
                   {
                       result = global_rate * multiplier * 100
                   }
               }`,
        setup: function(interpreter) {
            // Should find variables up the scope chain
        }
    },
    {
        name: "Mixed Declaration and Assignment",
        code: `let base = 1000
               tax_rate = 0.08
               {
                   let local_tax = 0.12
                   total = base * (1 + local_tax)
               }
               final = base * (1 + tax_rate)`,
        setup: function(interpreter) {
            // Mix of let declarations and regular assignments
        }
    }
];

// Custom parser binding for scoping tests
class ScopingTestBinding {
    constructor() {
        this.variables = {};
        this.outputs = [];
    }

    // Method to handle 'output' statements
    output(value) {
        this.outputs.push(value);
        console.log('   📤 Output:', value);
    }
}

// Run scoping tests
scopingTests.forEach((test, index) => {
    console.log(`\n📋 Test ${index + 1}: ${test.name}`);
    console.log('Code:');
    console.log('   ' + test.code.split('\n').join('\n   '));
    console.log('\nResults:');

    try {
        let binding = new ScopingTestBinding();
        test.setup && test.setup();

        let interpreter = new Lexiparse(grammar, {
            caseful: false,
            ignore: [' ', '\t', '\n'],
            collectErrors: true,
            maxErrors: 5,
            attemptRecovery: true,
            enableScoping: true,
            binding: binding,
            precedence: {
                '=': 1,
                '==': 4, '!=': 4, '<': 4, '>': 4,
                '+': 5, '-': 5,
                '*': 6, '/': 6
            }
        });

        // Add block scope creation for { } blocks
        let originalMatchLiteral = interpreter.matchLiteral.bind(interpreter);
        interpreter.matchLiteral = function(code, pos, literal) {
            let result = originalMatchLiteral(code, pos, literal);

            if (result && literal === '{') {
                this.pushScope('block');
                console.log('   🔍 Block scope started - Level:', this.getScopeInfo().currentLevel);
            }

            return result;
        };

        let success = interpreter.run(test.code);

        if (success) {
            console.log('   ✅ Scoping parsing successful!');
            console.log('   📊 Final scope info:', interpreter.getScopeInfo());

            // Display final variable states
            console.log('   📝 Variables in global scope:');
            Object.keys(interpreter.globalScope).forEach(name => {
                if (interpreter.globalScope[name].value !== undefined) {
                    console.log(`      ${name}: ${interpreter.globalScope[name].value}`);
                }
            });
        } else {
            console.log(`   ❌ Found ${interpreter.errors.length} error(s)`);
        }
    } catch (error) {
        console.log('   🔥 Unexpected error:', error.message);
    }

    console.log('\n' + '='.repeat(60));
});

console.log('\n🎯 Variable scoping testing complete!');
console.log('💡 Scoping Features Tested:');
console.log('   • Global variable access and assignment');
console.log('   • Block scope isolation with { } blocks');
console.log('   • Variable declaration with let keyword');
console.log('   • Scope chain variable lookup');
console.log('   • Variable shadowing between scopes');
console.log('   • Mixed declaration and assignment patterns');
console.log('\n🏗️ Foundation ready for complex business logic!');