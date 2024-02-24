// const seed = Math.random().toString(36);
// const cellSize = Math.random() * 100 + 50
//
// // Generate a random color palette
// const randomColor = () => {
//     let color = '#';
//     for (let i = 0; i < 6; i++){
//         const random = Math.random();
//         const bit = (random * 16) | 0;
//         color += (bit).toString(16);
//     }
//     return color;
// };
// const startColor = randomColor();
// const endColor = randomColor();
//
// // Linear interpolation of colors
// const colors = chroma.scale([startColor, endColor]).mode('lch').colors(9);
//
// triangle_bg = () => {
//     const pattern = trianglify({
//         width: window.innerWidth,
//         height: window.innerHeight,
//         seed: seed,
//         cellSize: cellSize,
//         palette: {Col: colors}
//     })
//     let canvas = document.getElementById("bg-canvas")
//     pattern.toCanvas(canvas)
// }
//
// document.addEventListener('DOMContentLoaded', function() {
//     triangle_bg()
//     // blur in
//     let cv = document.getElementById("bg-canvas")
//     for (let i = 0; i < 8; i++) {
//         cv.style.filter = "blur(" + i + "px)"
//         setTimeout(() => {
//             cv.style.filter = "blur(" + i + "px)"
//         }, i * 10)
//     }
// })
//
// window.onresize = () => {
//     triangle_bg()
// }
