// Variables globales
let selectedStyle = 'modern'; // Estilo visual por defecto
let gameInitialized = false; // Variable para controlar si el juego ya fue inicializado

// Elementos de audio
const moveSound = document.getElementById('moveSound');
const captureSound = document.getElementById('captureSound');
const kingSound = document.getElementById('kingSound');

// Estado del juego
let gameState = {
    board: [], // Matriz 8x8 para el tablero
    currentPlayer: 'white', // Jugador actual ('white' o 'black')
    selectedPiece: null, // Pieza seleccionada actualmente
    validMoves: [], // Movimientos válidos para la pieza seleccionada
    isAIThinking: false, // Indica si la IA está procesando su turno
    isContinuousCapture: false, // Indica si estamos en medio de capturas múltiples
    mustCapture: false // Solo se usa para la IA
};

// Inicialización de la interfaz
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el juego una sola vez al cargar la página
    initGame();
    gameInitialized = true;

    // Configurar selectores de estilo
    const styleOptions = document.querySelectorAll('.style-option');
    styleOptions.forEach(option => {
        option.addEventListener('click', () => {
            styleOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedStyle = option.dataset.style;
            
            // Actualizar el estilo del tablero
            const board = document.getElementById('board');
            board.className = `board ${selectedStyle}`;
        });
    });

    // Configurar botón de inicio
    document.getElementById('start-button').addEventListener('click', showGame);

    // Configurar botón de reinicio
    document.getElementById('reset-button').addEventListener('click', resetGame);

    // Configurar botón de volver al menú
    document.getElementById('back-to-menu').addEventListener('click', () => {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
    });

    // Seleccionar estilo moderno por defecto
    document.querySelector('[data-style="modern"]').classList.add('selected');
});

// Función para mostrar el juego (reemplaza a startGame)
function showGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // Asegurarse de que el tablero tenga el estilo correcto
    const board = document.getElementById('board');
    board.className = `board ${selectedStyle}`;
}

// Función para reproducir sonidos
function playSound(type) {
    switch(type) {
        case 'move':
            moveSound.currentTime = 0;
            moveSound.play();
            break;
        case 'capture':
            captureSound.currentTime = 0;
            captureSound.play();
            break;
        case 'king':
            kingSound.currentTime = 0;
            kingSound.play();
            break;
    }
}

// Función para iniciar el juego
function startGame() {
    // Ocultar pantalla inicial y mostrar pantalla de juego
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    // Aplicar el estilo seleccionado al tablero
    const board = document.getElementById('board');
    board.className = `board ${selectedStyle}`;

    // Solo inicializar el juego si no se ha hecho antes
    if (!gameInitialized) {
        initGame();
        gameInitialized = true;
    }
}

// Inicialización del juego
function initGame() {
    const board = document.getElementById('board');
    gameState.board = createBoard();
    
    // Solo crear el tablero visual si está vacío
    if (board.children.length === 0) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Agregar pieza si corresponde
                if (gameState.board[row][col]) {
                    const piece = createPiece(gameState.board[row][col]);
                    square.appendChild(piece);
                }
                
                square.addEventListener('click', handleSquareClick);
                board.appendChild(square);
            }
        }
    } else {
        // Si el tablero ya existe, solo actualizar las piezas
        updateBoard();
    }

    updateMessage();
}

// Crear la matriz del tablero inicial
function createBoard() {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Colocar piezas negras
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                board[row][col] = { color: 'black', isKing: false };
            }
        }
    }
    
    // Colocar piezas blancas
    for (let row = 5; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                board[row][col] = { color: 'white', isKing: false };
            }
        }
    }
    
    return board;
}

// Crear elemento visual de una pieza
function createPiece(pieceData) {
    const piece = document.createElement('div');
    piece.className = `piece ${pieceData.color}${pieceData.isKing ? ' king' : ''}`;
    return piece;
}

// Manejar el clic en un cuadro del tablero
function handleSquareClick(event) {
    if (gameState.currentPlayer === 'black') return; // No permitir clicks durante el turno de la IA
    
    const square = event.target.classList.contains('square') ? event.target : event.target.parentElement;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);

    // Si hay una pieza seleccionada y el cuadro es un movimiento válido
    if (gameState.selectedPiece && isValidMove(row, col)) {
        movePiece(row, col);
        return;
    }

    // Seleccionar una nueva pieza
    if (gameState.board[row][col] && gameState.board[row][col].color === gameState.currentPlayer) {
        selectPiece(row, col);
    }
}

// Seleccionar una pieza
function selectPiece(row, col) {
    // Limpiar selección anterior
    clearValidMoves();
    
    gameState.selectedPiece = { row, col };
    gameState.validMoves = calculateValidMoves(row, col);
    
    // Resaltar movimientos válidos
    gameState.validMoves.forEach(move => {
        const square = getSquareElement(move.row, move.col);
        square.classList.add('valid-move');
    });
}

// Calcular movimientos válidos para una pieza
function calculateValidMoves(row, col) {
    const piece = gameState.board[row][col];
    const moves = [];
    const directions = piece.isKing ? [-1, 1] : piece.color === 'white' ? [-1] : [1];
    
    // Si estamos en medio de una captura múltiple, solo mostrar capturas
    if (gameState.isContinuousCapture) {
        directions.forEach(rowDir => {
            [-1, 1].forEach(colDir => {
                // Movimiento de captura
                let newRow = row + (rowDir * 2);
                let newCol = col + (colDir * 2);
                
                if (isValidPosition(newRow, newCol) && !gameState.board[newRow][newCol]) {
                    const jumpedRow = row + rowDir;
                    const jumpedCol = col + colDir;
                    const jumpedPiece = gameState.board[jumpedRow][jumpedCol];
                    
                    if (jumpedPiece && jumpedPiece.color !== piece.color) {
                        moves.push({ 
                            row: newRow, 
                            col: newCol, 
                            isCapture: true,
                            capturedRow: jumpedRow,
                            capturedCol: jumpedCol
                        });
                    }
                }
            });
        });
    } else {
        // Movimientos normales y capturas
        directions.forEach(rowDir => {
            [-1, 1].forEach(colDir => {
                // Movimiento simple
                let newRow = row + rowDir;
                let newCol = col + colDir;
                
                if (isValidPosition(newRow, newCol) && !gameState.board[newRow][newCol]) {
                    moves.push({ row: newRow, col: newCol, isCapture: false });
                }

                // Movimiento de captura
                newRow = row + (rowDir * 2);
                newCol = col + (colDir * 2);
                
                if (isValidPosition(newRow, newCol) && !gameState.board[newRow][newCol]) {
                    const jumpedRow = row + rowDir;
                    const jumpedCol = col + colDir;
                    const jumpedPiece = gameState.board[jumpedRow][jumpedCol];
                    
                    if (jumpedPiece && jumpedPiece.color !== piece.color) {
                        moves.push({ 
                            row: newRow, 
                            col: newCol, 
                            isCapture: true,
                            capturedRow: jumpedRow,
                            capturedCol: jumpedCol
                        });
                    }
                }
            });
        });
    }

    return moves;
}

// Verificar si hay capturas disponibles para un jugador
function hasAvailableCaptures(player) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.color === player) {
                const moves = calculateValidMoves(row, col);
                if (moves.some(move => move.isCapture)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Mover una pieza
function movePiece(newRow, newCol) {
    const { row: oldRow, col: oldCol } = gameState.selectedPiece;
    const move = gameState.validMoves.find(m => m.row === newRow && m.col === newCol);
    
    // Mover la pieza
    gameState.board[newRow][newCol] = gameState.board[oldRow][oldCol];
    gameState.board[oldRow][oldCol] = null;
    
    // Si es una captura
    if (move.isCapture) {
        // Eliminar la pieza capturada
        gameState.board[move.capturedRow][move.capturedCol] = null;
        const capturedSquare = getSquareElement(move.capturedRow, move.capturedCol);
        capturedSquare.innerHTML = '';
        playSound('capture');

        // Verificar si hay más capturas disponibles desde la nueva posición
        const moreCapturesAvailable = calculateValidMoves(newRow, newCol)
            .some(move => move.isCapture);

        if (moreCapturesAvailable) {
            // Continuar el turno actual para más capturas
            gameState.isContinuousCapture = true;
            gameState.selectedPiece = { row: newRow, col: newCol };
            gameState.validMoves = calculateValidMoves(newRow, newCol);
            updateBoard();

            // Si es el turno de la IA, programar el siguiente movimiento
            if (gameState.currentPlayer === 'black') {
                setTimeout(makeAIMove, 500);
            }
            return;
        }
    } else {
        playSound('move');
    }

    // Verificar si la pieza se convierte en rey
    if ((newRow === 0 && gameState.currentPlayer === 'white') || 
        (newRow === 7 && gameState.currentPlayer === 'black')) {
        gameState.board[newRow][newCol].isKing = true;
        playSound('king');
    }

    // Actualizar el tablero visual
    updateBoard();
    
    // Finalizar el turno
    gameState.isContinuousCapture = false;
    gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
    gameState.selectedPiece = null;
    clearValidMoves();
    updateMessage();
    
    // Verificar victoria
    if (!checkWinCondition()) {
        // Si es el turno de las negras (IA), hacer su movimiento
        if (gameState.currentPlayer === 'black') {
            setTimeout(makeAIMove, 500);
        }
    }
}

// Funciones de IA
function makeAIMove() {
    if (gameState.isAIThinking) return;
    gameState.isAIThinking = true;

    try {
        let moveMade = false;

        // Si estamos en medio de una captura múltiple, continuar con la misma pieza
        if (gameState.isContinuousCapture && gameState.selectedPiece) {
            const moves = calculateValidMoves(gameState.selectedPiece.row, gameState.selectedPiece.col);
            const captureMoves = moves.filter(move => move.isCapture);
            
            if (captureMoves.length > 0) {
                // Elegir un movimiento de captura al azar
                const bestMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
                movePiece(bestMove.row, bestMove.col);
                moveMade = true;
            }
        }

        // Si no hay captura múltiple en progreso o no hay más capturas disponibles
        if (!moveMade) {
            const bestMove = findBestMove();
            if (bestMove) {
                gameState.selectedPiece = { row: bestMove.fromRow, col: bestMove.fromCol };
                gameState.validMoves = calculateValidMoves(bestMove.fromRow, bestMove.fromCol);
                movePiece(bestMove.toRow, bestMove.toCol);
            }
        }
    } catch (error) {
        console.error('Error en makeAIMove:', error);
    } finally {
        // Solo establecer isAIThinking a false si no estamos en medio de una captura múltiple
        if (!gameState.isContinuousCapture) {
            gameState.isAIThinking = false;
        }
    }
}

function findBestMove() {
    let bestScore = -Infinity;
    let bestMove = null;

    // Primero buscar todas las capturas disponibles
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.color === 'black') {
                const moves = calculateValidMoves(row, col);
                const captureMoves = moves.filter(move => move.isCapture);
                
                for (const move of captureMoves) {
                    const score = evaluateMove(move, piece, row, col);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = {
                            fromRow: row,
                            fromCol: col,
                            toRow: move.row,
                            toCol: move.col
                        };
                    }
                }
            }
        }
    }

    // Si no hay capturas, buscar movimientos normales
    if (!bestMove) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.color === 'black') {
                    const moves = calculateValidMoves(row, col);
                    const normalMoves = moves.filter(move => !move.isCapture);
                    
                    for (const move of normalMoves) {
                        const score = evaluateMove(move, piece, row, col);
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = {
                                fromRow: row,
                                fromCol: col,
                                toRow: move.row,
                                toCol: move.col
                            };
                        }
                    }
                }
            }
        }
    }

    return bestMove;
}

function evaluateMove(move, piece, currentRow, currentCol) {
    let score = 0;

    // Priorizar capturas
    if (move.isCapture) {
        score += 10;
        
        // Simular el movimiento para ver si hay más capturas posibles
        const tempBoard = JSON.parse(JSON.stringify(gameState.board));
        tempBoard[move.row][move.col] = tempBoard[currentRow][currentCol];
        tempBoard[currentRow][currentCol] = null;
        tempBoard[move.capturedRow][move.capturedCol] = null;
        
        // Verificar capturas adicionales desde la nueva posición
        const additionalMoves = calculateValidMovesForPosition(move.row, move.col, tempBoard);
        const additionalCaptures = additionalMoves.filter(m => m.isCapture).length;
        score += additionalCaptures * 5; // Bonus por capturas adicionales posibles
    }

    // Otros criterios de evaluación existentes
    if (!piece.isKing && move.row === 7) {
        score += 5;
    }

    if (isProtected(move.row, move.col)) {
        score += 2;
    }

    const distanceToPromotion = piece.isKing ? 0 : (7 - move.row);
    score += distanceToPromotion * 0.3;

    score += Math.random() * 0.2;

    return score;
}

function isProtected(row, col) {
    // Verificar si hay piezas amigas cerca que puedan proteger esta posición
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    let protectedCount = 0;

    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (isValidPosition(newRow, newCol)) {
            const piece = gameState.board[newRow][newCol];
            if (piece && piece.color === 'black') {
                protectedCount++;
            }
        }
    }

    return protectedCount > 0;
}

// Función auxiliar para calcular movimientos en un tablero temporal
function calculateValidMovesForPosition(row, col, tempBoard) {
    const piece = tempBoard[row][col];
    const moves = [];
    const directions = piece.isKing ? [-1, 1] : [1];

    directions.forEach(rowDir => {
        [-1, 1].forEach(colDir => {
            let newRow = row + (rowDir * 2);
            let newCol = col + (colDir * 2);
            
            if (isValidPosition(newRow, newCol) && !tempBoard[newRow][newCol]) {
                const jumpedRow = row + rowDir;
                const jumpedCol = col + colDir;
                const jumpedPiece = tempBoard[jumpedRow][jumpedCol];
                
                if (jumpedPiece && jumpedPiece.color !== piece.color) {
                    moves.push({ 
                        row: newRow, 
                        col: newCol, 
                        isCapture: true,
                        capturedRow: jumpedRow,
                        capturedCol: jumpedCol
                    });
                }
            }
        });
    });

    return moves;
}

// Funciones auxiliares
function isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isValidMove(row, col) {
    return gameState.validMoves.some(move => move.row === row && move.col === col);
}

function getSquareElement(row, col) {
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function clearValidMoves() {
    document.querySelectorAll('.valid-move').forEach(square => {
        square.classList.remove('valid-move');
    });
    gameState.validMoves = [];
}

function updateBoard() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = getSquareElement(row, col);
            square.innerHTML = '';
            
            if (gameState.board[row][col]) {
                const piece = createPiece(gameState.board[row][col]);
                square.appendChild(piece);
            }
        }
    }
}

function updateMessage() {
    const message = document.getElementById('turn-message');
    message.textContent = `Turno de ${gameState.currentPlayer === 'white' ? 'Blancas' : 'Negras'}`;
}

function checkWinCondition() {
    const hasWhitePieces = gameState.board.some(row => 
        row.some(piece => piece && piece.color === 'white')
    );
    const hasBlackPieces = gameState.board.some(row => 
        row.some(piece => piece && piece.color === 'black')
    );

    if (!hasWhitePieces || !hasBlackPieces) {
        // Crear el elemento de la pantalla de resultado
        const resultScreen = document.createElement('div');
        resultScreen.className = 'result-screen';
        
        // Determinar el mensaje según el ganador
        let message;
        if (!hasWhitePieces) {
            message = '¡DERROTA!';
            resultScreen.classList.add('defeat');
        } else {
            message = '¡VICTORIA!';
            resultScreen.classList.add('victory');
        }
        
        // Crear el contenido de la pantalla de resultado
        resultScreen.innerHTML = `
            <div class="result-content">
                <h2>${message}</h2>
                <button onclick="resetGame()" class="reset-button">Jugar de nuevo</button>
            </div>
        `;
        
        // Agregar la pantalla al tablero
        const gameScreen = document.getElementById('game-screen');
        gameScreen.appendChild(resultScreen);
        
        // Actualizar el mensaje de turno
        document.getElementById('turn-message').textContent = 
            !hasWhitePieces ? 'Victoria de las Negras' : 'Victoria de las Blancas';
        
        return true;
    }
    return false;
}

function resetGame() {
    // Reiniciar el estado del juego
    gameState = {
        board: [],
        currentPlayer: 'white',
        selectedPiece: null,
        validMoves: [],
        isAIThinking: false,
        isContinuousCapture: false,
        mustCapture: false
    };
    
    // Limpiar el tablero existente
    const board = document.getElementById('board');
    board.innerHTML = '';
    board.className = `board ${selectedStyle}`;
    
    // Eliminar la pantalla de resultado si existe
    const resultScreen = document.querySelector('.result-screen');
    if (resultScreen) {
        resultScreen.remove();
    }
    
    // Reinicializar el juego
    initGame();
}

// Iniciar el juego cuando se carga la página
window.addEventListener('load', initGame); 