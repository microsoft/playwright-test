beforeEach(state => {
  state.before = true;
});

it('is one test', state => {
  expect(state.before).toEqual(true);
});
