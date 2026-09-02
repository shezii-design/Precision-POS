const fs = require('fs');
let code = fs.readFileSync('.github/workflows/deploy.yml', 'utf-8');

const newSteps = `      - name: Install dependencies
        run: npm ci || npm install

      # Check for Android directory and print SHA fingerprints if it exists
      - name: Print Android SHA Fingerprints
        run: |
          if [ -d "android" ]; then
            cd android && ./gradlew signingReport
          elif [ -f "gradlew" ]; then
            ./gradlew signingReport
          else
            echo "⚠️ No Android project (gradlew) found in this repository. Skipping fingerprint printing."
          fi
`;

code = code.replace(
  '      - name: Install dependencies\n        run: npm ci || npm install',
  newSteps
);

fs.writeFileSync('.github/workflows/deploy.yml', code);
console.log('patched deploy.yml');
