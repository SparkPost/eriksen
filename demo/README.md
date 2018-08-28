# Eriksen Demo

This demo sets up two hypothetical user models and loops through read and write calls to ilustrate how eriksen handles the calls. Helper functions create random delays and failures to simulate a real database connection.

The models are defined in `lib/primaryModel.js` & `/lib/secondaryModel.js`.

To run the demo:
```
node index.js
```

Change the `loop`, `reads`, `writes` variables in `index.js` to simulate different situations. 
