{ pkgs ? import <unstable> {}}: with pkgs;

mkShell {
  buildInputs = [ nodejs rustup wasm-pack ];
}
