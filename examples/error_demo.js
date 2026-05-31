#!/usr/bin/nodejs

var Lexiparse = require('../lexiparse.js');

// Enhanced BizScript grammar for testing error handling (without left recursion)
let grammar = {
    'stmt': [
        ['output', '=', ':expr'],
        [':var', '=', ':expr'],
        ['if', '(', ':expr', ')', ':stmt'],
        ['if', '(', ':expr', ')', '{', ':block', '}']
    ],
    'block': [
        [':stmt'],
        [':stmt', ':block']
    ],
    'expr': [
        // Use precedence parsing for operators, non-recursive base cases
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

console.log('🧪 Testing Enhanced Error Handling\n');

// Test programs with various error types
let errorTests = [
    {
        name: "Missing Quotes Around Text",
        code: `output = hello world`
    },
    {
        name: "Wrong Assignment Operator",
        code: `if (total = 100) output = "matched"`
    },
    {
        name: "Misspelled Keywords",
        code: `ouput = "test"
                fi (x > 10) output = "big"`
    },
    {
        name: "Unmatched Parentheses",
        code: `total = (rate * amount + tax
                output = total`
    },
    {
        name: "Invalid Variable Names",
        code: `2total = 100
                my-var = 200`
    },
    {
        name: "Multiple Errors",
        code: `rate = 5.5
                total = rate * amount + tax)
                if (total = 200 {
                    ouput = good job
                }
                final = total`
    }
];

// Run each error test
errorTests.forEach((test, index) => {
    console.log(`\n📋 Test ${index + 1}: ${test.name}`);
    console.log('Code:');
    console.log('   ' + test.code.split('\n').join('\n   '));
    console.log('\nResults:');

    try {
        let interpreter = new Lexiparse(grammar, {
            caseful: false,
            ignore: [' ', '\t', '\n'],
            collectErrors: true,
            maxErrors: 5,
            attemptRecovery: true,
            precedence: {
                '=': 1,
                '==': 4, '!=': 4, '<': 4, '>': 4,
                '+': 5, '-': 5,
                '*': 6, '/': 6
            }
        });

        let success = interpreter.run(test.code);

        if (success) {
            console.log('   ✅ Parsing successful!');
        } else {
            console.log(`   ❌ Found ${interpreter.errors.length} error(s)`);
        }
    } catch (error) {
        console.log('   🔥 Unexpected error:', error);
    }

    console.log('\n' + '='.repeat(60));
});

console.log('\n🎯 Error handling demonstration complete!');
console.log('💡 Notice how errors now provide:');
console.log('   • Clear business-friendly messages');
console.log('   • Specific line and column numbers');
console.log('   • Helpful suggestions for fixes');
console.log('   • Context showing the problematic code');
console.log('   • Multiple error collection instead of stopping at first');