import { optimizeNextInvocation } from "bun:jsc";
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
    .filter(
      (snake) => snake.id !== gameState.you.id && mySnakeLength > snake.length
    )
    .forEach((snake) => {
      snake.body.forEach((segment) => {
        if (
          snake.head.x === segment.x &&
          snake.head.y === segment.y &&
          snake.length < mySnakeLength
        ) {
          return;
        }

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

  // Find the closest snake head to a given coordinate
  const findClosestSnakeHead = (targetCoord: Coord) => {
    const snakes = gameState.board.snakes;

    if (snakes.length === 0) return null;

    let closestSnake = snakes[0];
    let minDistance =
      Math.abs(targetCoord.x - closestSnake.head.x) +
      Math.abs(targetCoord.y - closestSnake.head.y);

    for (let i = 1; i < snakes.length; i++) {
      const distance =
        Math.abs(targetCoord.x - snakes[i].head.x) +
        Math.abs(targetCoord.y - snakes[i].head.y);
      if (distance < minDistance) {
        minDistance = distance;
        closestSnake = snakes[i];
      }
    }

    return closestSnake.id;
  };

  // Check how many open coordinates are next to a given coordinate
  const countOpenAdjacentCoords = (targetCoord: Coord) => {
    const adjacentCoords = [
      { x: targetCoord.x - 1, y: targetCoord.y }, // left
      { x: targetCoord.x + 1, y: targetCoord.y }, // right
      { x: targetCoord.x, y: targetCoord.y - 1 }, // down
      { x: targetCoord.x, y: targetCoord.y + 1 }, // up
    ];

    let openCount = 0;

    adjacentCoords.forEach((coord) => {
      // Check if coordinate is within board bounds
      if (
        coord.x >= 0 &&
        coord.x < gameState.board.width &&
        coord.y >= 0 &&
        coord.y < gameState.board.height
      ) {
        // Check if coordinate is occupied by any snake body
        let isOccupied = false;

        gameState.board.snakes.forEach((snake) => {
          snake.body.forEach((bodySegment) => {
            if (bodySegment.x === coord.x && bodySegment.y === coord.y) {
              isOccupied = true;
            }
          });
        });

        // Check if coordinate is a hazard
        const isHazard = gameState.board.hazards.some(
          (hazard) => hazard.x === coord.x && hazard.y === coord.y
        );

        if (!isOccupied && !isHazard) {
          openCount++;
        }
      }
    });

    return openCount;
  };

  // Helper function to check if a coordinate is open (not occupied by snakes or hazards)
  const isCoordOpen = (coord: Coord) => {
    // Check if coordinate is within board bounds
    if (
      coord.x < 0 ||
      coord.x >= gameState.board.width ||
      coord.y < 0 ||
      coord.y >= gameState.board.height
    ) {
      return false;
    }

    // Check if coordinate is occupied by any snake body
    let isOccupied = false;
    gameState.board.snakes.forEach((snake) => {
      snake.body.forEach((bodySegment) => {
        if (bodySegment.x === coord.x && bodySegment.y === coord.y) {
          isOccupied = true;
        }
      });
    });

    // Check if coordinate is a hazard
    const isHazard = gameState.board.hazards.some(
      (hazard) => hazard.x === coord.x && hazard.y === coord.y
    );

    return !isOccupied && !isHazard;
  };

  // Check if a coordinate is part of a connected space with more than 5 open coordinates
  const isPartOfLargeOpenSpace = (startCoord: Coord, minSize: number = 5) => {
    if (!isCoordOpen(startCoord)) {
      return false;
    }

    const visited = new Set<string>();
    const queue: Coord[] = [startCoord];
    const coordToString = (coord: Coord) => `${coord.x},${coord.y}`;

    visited.add(coordToString(startCoord));
    let openSpaceSize = 1;

    while (queue.length > 0 && openSpaceSize < minSize) {
      const currentCoord = queue.shift()!;

      // Check all 4 adjacent coordinates
      const adjacentCoords = [
        { x: currentCoord.x - 1, y: currentCoord.y }, // left
        { x: currentCoord.x + 1, y: currentCoord.y }, // right
        { x: currentCoord.x, y: currentCoord.y - 1 }, // down
        { x: currentCoord.x, y: currentCoord.y + 1 }, // up
      ];

      for (const adjCoord of adjacentCoords) {
        const coordKey = coordToString(adjCoord);

        if (!visited.has(coordKey) && isCoordOpen(adjCoord)) {
          visited.add(coordKey);
          queue.push(adjCoord);
          openSpaceSize++;

          // Early exit if we've found enough open space
          if (openSpaceSize >= minSize) {
            return true;
          }
        }
      }
    }

    return openSpaceSize >= minSize;
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

  if (countOpenAdjacentCoords(coordsAroundHead[0]) === 0) {
    isMoveSafe.left = false;
  }
  if (countOpenAdjacentCoords(coordsAroundHead[1]) === 0) {
    isMoveSafe.right = false; // Other snake is to the left
  }
  if (countOpenAdjacentCoords(coordsAroundHead[2]) === 0) {
    isMoveSafe.down = false;
  }
  if (countOpenAdjacentCoords(coordsAroundHead[3]) === 0) {
    isMoveSafe.up = false; // Other snake is to the left
  }

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
    const closestSnakeId = findClosestSnakeHead(f);
    if (distance < minDistanceFood && closestSnakeId === gameState.you.id) {
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

  const opponents = gameState.board.snakes.filter(
    (snake) => snake.id !== gameState.you.id
  );

  // If distance shorter than 3, move towards head of shorter snake
  if (
    minDistanceSnakes < 3 ||
    (opponents.length === 1 && opponents[0].length + 1 < mySnakeLength)
  ) {
    console.log("Go for kill");
    const closestShorterSnake =
      shorterSnakesHeads[distances.indexOf(minDistanceSnakes)];
    if (closestShorterSnake.x < myHead.x) {
      nextMove = "left";
    } else if (closestShorterSnake.x > myHead.x) {
      nextMove = "right";
    }
    // If no snake to kill and food which I am closest to, move towards food
  } else if (closestFood !== undefined) {
    console.log("Go for food");
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
    // If no food to move towards choose any space with enough open space next to it
  } else {
    console.log("No food or kill found");
    // Filter safe moves by whether they lead to large open spaces
    const safeMovesInOpenSpace = safeMoves.filter((move) => {
      let targetCoord: Coord;
      switch (move) {
        case "up":
          targetCoord = { x: myHead.x, y: myHead.y + 1 };
          break;
        case "down":
          targetCoord = { x: myHead.x, y: myHead.y - 1 };
          break;
        case "left":
          targetCoord = { x: myHead.x - 1, y: myHead.y };
          break;
        case "right":
          targetCoord = { x: myHead.x + 1, y: myHead.y };
          break;
        default:
          return false;
      }
      return isPartOfLargeOpenSpace(targetCoord, 5);
    });
    if (safeMovesInOpenSpace.length > 0) {
      nextMove =
        safeMovesInOpenSpace[
          Math.floor(Math.random() * safeMovesInOpenSpace.length)
        ];
    } else {
      console.log("No moves part of open space, choosing random!");
    }
  }

  console.log(`MOVE ${gameState.turn}: ${nextMove}`);
  console.log(isMoveSafe);
  return { move: nextMove };
}
