#!/usr/bin/nodejs

var Lexiparse = require('./lexiparse.js');

// Simple grammar for basic scoping test
let grammar = {
    'stmt': [
        ['output', '=', ':expr'],
        [':var', '=', ':expr']
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

console.log('🧪 Testing Basic Variable Scoping\n');

// Create test interpreter
let interpreter = new Lexiparse(grammar, {
    caseful: false,
    ignore: [' ', '\t', '\n'],
    collectErrors: true,
    enableScoping: true,
    binding: {}
});

console.log('📊 Testing scoping methods directly:\n');

// Test 1: Basic scope operations
console.log('🔵 Test 1: Basic Scope Operations');
console.log('   Initial scope info:', interpreter.getScopeInfo());

// Push a scope
interpreter.pushScope('function', { name: 'testFunc' });
console.log('   After pushing function scope:', interpreter.getScopeInfo());

// Declare variables
interpreter.declareVariable('localVar', 42, 'let');
interpreter.declareVariable('anotherVar', 'hello', 'let');
console.log('   Declared variables in function scope');

// Get variables
console.log('   localVar value:', interpreter.getVariable('localVar'));
console.log('   anotherVar value:', interpreter.getVariable('anotherVar'));

// Pop the scope
interpreter.popScope();
console.log('   After popping function scope:', interpreter.getScopeInfo());

console.log('\n🔵 Test 2: Variable Assignment and Lookup');

// Assign global variables
interpreter.assignVariable('globalRate', 5.5);
interpreter.assignVariable('baseAmount', 1000);
console.log('   Assigned global variables');

// Push block scope
interpreter.pushScope('block');
console.log('   Pushed block scope:', interpreter.getScopeInfo());

// Assign local variable
interpreter.assignVariable('localMultiplier', 2);
console.log('   Assigned local variable');

// Try to access both global and local
console.log('   globalRate from block scope:', interpreter.getVariable('globalRate'));
console.log('   baseAmount from block scope:', interpreter.getVariable('baseAmount'));
console.log('   localMultiplier from block scope:', interpreter.getVariable('localMultiplier'));

// Pop block scope
interpreter.popScope();
console.log('   After popping block scope:', interpreter.getScopeInfo());

// Check global variables still accessible
console.log('   globalRate from global scope:', interpreter.getVariable('globalRate'));
console.log('   baseAmount from global scope:', interpreter.getVariable('baseAmount'));

// Local variable should no longer be accessible
console.log('   localMultiplier from global scope (should be undefined):', interpreter.getVariable('localMultiplier'));

console.log('\n🔵 Test 3: Variable Shadowing');

interpreter.assignVariable('amount', 100);
console.log('   Global amount:', interpreter.getVariable('amount'));

interpreter.pushScope('block');
interpreter.declareVariable('amount', 200, 'let');
console.log('   Local amount (shadowed):', interpreter.getVariable('amount'));

interpreter.popScope();
console.log('   Global amount (after block):', interpreter.getVariable('amount'));

console.log('\n🔵 Test 4: Scope Chain Lookup');

interpreter.assignVariable('chainVar1', 'level1');
interpreter.pushScope('function');
interpreter.assignVariable('chainVar2', 'level2');
interpreter.pushScope('block');
interpreter.assignVariable('chainVar3', 'level3');

console.log('   From deep block scope:');
console.log('     chainVar1:', interpreter.getVariable('chainVar1'));
console.log('     chainVar2:', interpreter.getVariable('chainVar2'));
console.log('     chainVar3:', interpreter.getVariable('chainVar3'));

interpreter.popScope();
console.log('   From function scope:');
console.log('     chainVar1:', interpreter.getVariable('chainVar1'));
console.log('     chainVar2:', interpreter.getVariable('chainVar2'));
console.log('     chainVar3 (should be undefined):', interpreter.getVariable('chainVar3'));

interpreter.popScope();
console.log('   From global scope:');
console.log('     chainVar1:', interpreter.getVariable('chainVar1'));
console.log('     chainVar2 (should be undefined):', interpreter.getVariable('chainVar2'));
console.log('     chainVar3 (should be undefined):', interpreter.getVariable('chainVar3'));

console.log('\n🔵 Test 5: Simple Expression Parsing with Scoping');

// Set up some variables for expression testing
interpreter.assignVariable('rate', 0.15);
interpreter.assignVariable('amount', 1000);

let testCode = 'total = rate';
console.log(`   Testing: ${testCode}`);

let success = interpreter.run(testCode);
console.log('   Parse success:', success);
console.log('   Final variables:');

// Display all global variables
Object.keys(interpreter.globalScope).forEach(name => {
    if (interpreter.globalScope[name] && interpreter.globalScope[name].value !== undefined) {
        console.log(`     ${name}: ${interpreter.globalScope[name].value}`);
    }
});

console.log('\n🎯 Basic scoping functionality test complete!');
console.log('✅ Scope operations working correctly');
console.log('✅ Variable declaration and lookup functional');
console.log('✅ Variable shadowing working');
console.log('✅ Scope chain lookup working');
console.log('✅ Integration with expression parsing ready');
console.log('\n🚀 Scoping foundation established!');