# babel-plugin-third-party-imports

Appends `https://third_party/` to all imports that reference packages.

For example

```js
import * from 'something';
```

Becomes
```js
import * from 'https://third_party/?name=something&from=/path/to/file';
```

This is useful because imports that aren't urls or relative paths are invalid in browsers. Transforming them allows a server or proxy to redirect them to a compiled bundle.

