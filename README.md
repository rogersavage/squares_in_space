# squares_in_space
Javascript canvas shooter game

Play in browser at https://www.aaronsavage.net/squaresinspace/game.html

This game was created as a learning exercise. I wanted to become more familiar
with Javascript, and to experiment with object-oriented techniques including
message passing and dependency injection. For this reason, the code is
almost comically bloated and highly inefficient. Additionally, the
aforementioned OOP techniques have been implemented inconsistently and in
some cases very sloppily, but the project got far enough along that I learned
what I needed to from it and chose to move on.

I am deeply embarrassed to create a game that looks and plays like what I 
consider to be the greatest arcade games in history, from circa 1979-1981, 
and yet consumes a shocking amount of computing power. If I decide to develop 
this idea for real, I will almost certainly do so in C and in a much simpler 
procedural style appropriate to the scope of the project.

All that said, it's a compact but complete game and quite fun.

Move with WASD. Shoot with space.

Don't touch red squares.

Shoot red squares for 1 point.

Collect yellow squares for 1 point.

Collect the small cyan square to upgrade to a penetrating shot.

You can only shoot to the right. When red squares surround you from behind,
you must either dodge them to get back to the left side of the screen,
or touch the large cyan square to teleport across the screen. The teleporter
returns you to the start position, but it does not ensure that your destination
is safe, and the teleporter takes a few seconds to recharge after it has been
used.

When the number of enemies falls below a certain threshold, a new wave spawns.
The respawn threshold and the size of the new waves gradually increases in
proportion to your score and to the time elapsed. Because of this very simple
difficulty scaling, the game suddenly becomes very difficult around 500
points and virtually impossible at around 1,000 points, although the difficulty
scalars do max out at a certain point.

The enemies move using a very simple "boids" flocking algorithm. I discovered
that it is possible for the enemy flock to fall into an equilibrium state
in which they circle continuously around the player without attacking, but I
decided this is not a problem because the player cannot score without
attacking, and because after a few seconds the timer will cause a new wave to
spawn, and the incoming enemies will disrupt the equilibrium anyway.

For this reason, I also experimented with having the enemies occasionally
shoot their own bullets at the player, but I decided the game is already
both challenging enough and shouldn't be any more visually cluttered.

Sound effects were created using the excellent ChipTone
(https://sfbgames.itch.io/chiptone).
