import { assert } from 'chai';

import parseQuery from '../../../js/common/util/parse_query.js';

describe('parseQuery', () => {
  it('works', () => {
    assert.deepEqual(parseQuery('hello=world'), { hello: 'world' });
    assert.deepEqual(parseQuery('hello=world&drink=soda'), {
      hello: 'world',
      drink: 'soda',
    });
    assert.deepEqual(parseQuery('hello=world&no_value&drink=soda'), {
      hello: 'world',
      no_value: undefined,
      drink: 'soda',
    });
  });
});
