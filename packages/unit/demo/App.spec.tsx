import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';

it('should work', function() {
  const container = document.createElement('div');
  ReactDOM.render(<App />, container);
  expect(container.textContent).toBe('Hello World');
});
