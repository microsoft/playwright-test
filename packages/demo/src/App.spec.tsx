import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';

it('should work', function() {
  const container = document.createElement('div');
  ReactDOM.render(<App />, container);
  expect(container.textContent).toBe('Hello World');
});

it('should type into an input', async function() {
  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();
  await (window as any).keyboard.type('Hello World');
  expect(input.value).toBe('Hello World');
});
