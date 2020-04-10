# babel-plugin-third-party-imports

Appends `https://third_party/` to all imports that reference packages.

For example

```js
import * from 'something';
```

Becomes
```js
import * from 'https://third_party/something';
```

This is useful because imports that aren't urls or relative paths are invalid in browsers.

