# Norine igre

A website for Nora, a girl vibe-coding video games.

The website looks like a piece of paper on a table with crayons.

The piece of paper has two sides: the landing page says Norine Igre, and contains two drawn "cards" for two current games. These images are collage / colored pencil renditions of a screen from each game - contained in images as chickengame.png and deliverygame.png. As you hover over each image, it tilts slightly to indicate it's interactive / clickable. Clicking on it leads to an external link of that particular game.

The first two games are:

1. Fashion Chicken Express where a royal chicken with a crown in a princess peach dress jumps on top of train wagons and avoids cooks trying to grab it. The image is a scene from the game, stylized childishly.
2. Delivery man: a game of delivering packages. The player takes a package or more from the prep screen and then has to deliver to marked houses on the map. The image is the cockpit of the truck with a steering wheel and bobblehead visible, and houses in the distance.

Examples of how the website should roughly look are in ./example_visuals folder.

There is a "flip page" button in the right side, or the bottom right of the paper, somewhere visible but not too obvious, which allows visitors to flip the page. Flipping the page turns the paper around, and this side has "O Meni", which will feature handwritten text from Nora about herself.

The piece of paper is on a desk of crayons, the image of which is in the ./images folder as desk.png.

The website should not use node for any reason whatsoever, only Bun is allowed as the JS runtime. The website should be statically hostable, so it should compile into a static bundle with a command like bun run build or similar.
