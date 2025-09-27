import { Coord, GameState, InfoResponse, MoveResponse } from "./types";

export function info(): InfoResponse {
  console.log("INFO");
  return {
    apiversion: "1",
    author: "Bubblun",
    color: "#5AC252",
    head: "default",
    tail: "default",
  };
}

export function start(gameState: GameState): void {
  console.log(`${gameState.game.id} START`);
}

export function end(gameState: GameState): void {
  console.log(`${gameState.game.id} END\n`);
}

export function move(gameState: GameState): MoveResponse {
  // Get the length of your own battlesnake
  const mySnakeLength = gameState.you.length;

  let isMoveSafe: { [key: string]: boolean } = {
    up: true,
    down: true,
    left: true,
    right: true,
  };

  // Step 0: Don't move backwards
  const myHead = gameState.you.head;
  const myNeck = gameState.you.body[1];

  if (myNeck.x < myHead.x) {
    isMoveSafe.left = false;
  } else if (myNeck.x > myHead.x) {
    isMoveSafe.right = false;
  } else if (myNeck.y < myHead.y) {
    isMoveSafe.down = false;
  } else if (myNeck.y > myHead.y) {
    isMoveSafe.up = false;
  }

  // Step 1: Prevent moving out of bounds
  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;

  if (myHead.x === 0) {
    isMoveSafe.left = false;
  }
  if (myHead.x === boardWidth - 1) {
    isMoveSafe.right = false;
  }
  if (myHead.y === 0) {
    isMoveSafe.down = false;
  }
  if (myHead.y === boardHeight - 1) {
    isMoveSafe.up = false;
  }

  // Step 2: Prevent colliding with yourself
  const myBody = gameState.you.body;
  myBody.forEach((segment) => {
    if (myHead.x === segment.x - 1 && myHead.y === segment.y) {
      isMoveSafe.right = false; // My body is to the right
    }
    if (myHead.x === segment.x + 1 && myHead.y === segment.y) {
      isMoveSafe.left = false; // My body is to the left
    }
    if (myHead.y === segment.y - 1 && myHead.x === segment.x) {
      isMoveSafe.up = false; // My body is above
    }
    if (myHead.y === segment.y + 1 && myHead.x === segment.x) {
      isMoveSafe.down = false; // My body is below
    }
  });

  // TODO: Step 3 - Prevent your Battlesnake from colliding with other Battlesnakes
  gameState.board.snakes
    .filter((snake) => snake.id !== gameState.you.id)
    .forEach((snake) => {
      snake.body.forEach((segment) => {
        if (myHead.x === segment.x - 1 && myHead.y === segment.y) {
          isMoveSafe.right = false; // Other snake is to the right
        }
        if (myHead.x === segment.x + 1 && myHead.y === segment.y) {
          isMoveSafe.left = false; // Other snake is to the left
        }
        if (myHead.y === segment.y - 1 && myHead.x === segment.x) {
          isMoveSafe.up = false; // Other snake is above
        }
        if (myHead.y === segment.y + 1 && myHead.x === segment.x) {
          isMoveSafe.down = false; // Other snake is below
        }
      });
    });

  // Check if coord is next to other coord
  const isNextTo = (coord1: Coord, coord2: Coord) => {
    return (
      (coord1.x === coord2.x && coord1.y === coord2.y + 1) ||
      (coord1.x === coord2.x && coord1.y === coord2.y - 1) ||
      (coord1.y === coord2.y && coord1.x === coord2.x + 1) ||
      (coord1.y === coord2.y && coord1.x === coord2.x - 1)
    );
  };

  // Generate coord
  const coordsAroundHead = [
    { x: myHead.x - 1, y: myHead.y },
    { x: myHead.x + 1, y: myHead.y },
    { x: myHead.x, y: myHead.y - 1 },
    { x: myHead.x, y: myHead.y + 1 },
  ];

  // Check if other snakes may move into same space as you and mark as unsafe
  gameState.board.snakes
    .filter((snake) => snake.id !== gameState.you.id)
    .forEach((snake) => {
      const head = snake.head;
      if (isNextTo(coordsAroundHead[0], head)) {
        console.log("Other snake is to the left");
        isMoveSafe.left = false; // Other snake is to the right
      }
      if (isNextTo(coordsAroundHead[1], head)) {
        console.log("Other snake is to the right");
        isMoveSafe.right = false; // Other snake is to the left
      }
      if (isNextTo(coordsAroundHead[2], head)) {
        console.log("Other snake is below");
        isMoveSafe.down = false; // Other snake is above
      }
      if (isNextTo(coordsAroundHead[3], head)) {
        console.log("Other snake is above");
        isMoveSafe.up = false; // Other snake is below
      }
    });

  // Get all safe moves
  const safeMoves = Object.keys(isMoveSafe).filter((key) => isMoveSafe[key]);

  if (safeMoves.length == 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    return { move: "down" };
  }

  // Step 4: Move towards the closest food
  const food = gameState.board.food;
  let closestFood: Coord | undefined;
  let minDistanceFood = Infinity;

  food.forEach((f) => {
    const distance = Math.abs(myHead.x - f.x) + Math.abs(myHead.y - f.y);
    if (distance < minDistanceFood) {
      minDistanceFood = distance;
      closestFood = f;
    }
  });

  // Find all snakes shorter than you
  const shorterSnakes = gameState.board.snakes.filter(
    (snake) => snake.length + 1 < mySnakeLength && snake.id !== gameState.you.id
  );

  // Find distance to head of shorter snakes
  const shorterSnakesHeads = shorterSnakes.map((snake) => snake.head);
  const distances = shorterSnakesHeads.map(
    (head) => Math.abs(myHead.x - head.x) + Math.abs(myHead.y - head.y)
  );
  const minDistanceSnakes = Math.min(...distances);

  let nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
  // If distance shorter than 3, move towards head of shorter snake
  if (minDistanceSnakes < 3) {
    const closestShorterSnake =
      shorterSnakesHeads[distances.indexOf(minDistanceSnakes)];
    if (closestShorterSnake.x < myHead.x) {
      nextMove = "left";
    } else if (closestShorterSnake.x > myHead.x) {
      nextMove = "right";
    }
  } else if (closestFood !== undefined) {
    const preferredMoves: string[] = [];
    if (myHead.x < closestFood.x) {
      preferredMoves.push("right");
    } else if (myHead.x > closestFood.x) {
      preferredMoves.push("left");
    }
    if (myHead.y < closestFood.y) {
      preferredMoves.push("up");
    } else if (myHead.y > closestFood.y) {
      preferredMoves.push("down");
    }

    // Choose a preferred move if it's safe
    const safePreferredMoves = preferredMoves.filter((move) =>
      safeMoves.includes(move)
    );
    if (safePreferredMoves.length > 0) {
      nextMove =
        safePreferredMoves[
          Math.floor(Math.random() * safePreferredMoves.length)
        ];
    }
  }

  console.log(`MOVE ${gameState.turn}: ${nextMove}`);
  console.log(isMoveSafe);
  return { move: nextMove };
}
