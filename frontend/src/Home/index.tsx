import { ColorSwatch } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '@/constants';
import { Palette, X, BrainCircuit } from 'lucide-react';

interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState({});
    const [result, setResult] = useState<GeneratedResult>();
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [isColorBarVisible, setIsColorBarVisible] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        //@ts-expect-error
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                //@ts-expect-error
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const updateCanvasSize = () => {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight - canvas.offsetTop;
                    ctx.lineCap = 'round';
                    ctx.lineWidth = 3;
                };

                // Set initial size
                updateCanvasSize();

                // Add resize event listener for responsive canvas
                window.addEventListener('resize', updateCanvasSize);

                // Clean up event listener
                return () => window.removeEventListener('resize', updateCanvasSize);
            }
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            //@ts-expect-error
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };

        return () => {
            document.head.removeChild(script);
        };

    }, []);

    const renderLatexToCanvas = (expression: string, answer: string) => {
        const latex = `${expression} = ${answer}`;
        setLatexExpression([...latexExpression, latex]);

        
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };


    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.background = 'black';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color;
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Touch event handlers
    const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling when drawing
        const canvas = canvasRef.current;
        if (canvas && e.touches[0]) {
            canvas.style.background = 'black';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const rect = canvas.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left;
                const y = e.touches[0].clientY - rect.top;
                ctx.beginPath();
                ctx.moveTo(x, y);
                setIsDrawing(true);
            }
        }
    };

    const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling when drawing
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas && e.touches[0]) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const rect = canvas.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left;
                const y = e.touches[0].clientY - rect.top;
                ctx.strokeStyle = color;
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    };

    const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent default touch behavior
        setIsDrawing(false);
    };

    const runRoute = async () => {
        const canvas = canvasRef.current;

        if (canvas) {
            setIsCalculating(true); // Start loading animation
            
            try {
                const response = await axios({
                    method: 'post',
                    url: `${import.meta.env.VITE_API_URL}/calculate`,
                    data: {
                        image: canvas.toDataURL('image/png'),
                        dict_of_vars: dictOfVars
                    }
                });

                const resp = await response.data;
                console.log('Response', resp);
                resp.data.forEach((data: Response) => {
                    if (data.assign === true) {
                        setDictOfVars({
                            ...dictOfVars,
                            [data.expr]: data.result
                        });
                    }
                });
                
                const ctx = canvas.getContext('2d');
                const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

                for (let y = 0; y < canvas.height; y++) {
                    for (let x = 0; x < canvas.width; x++) {
                        const i = (y * canvas.width + x) * 4;
                        if (imageData.data[i + 3] > 0) {
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            maxX = Math.max(maxX, x);
                            maxY = Math.max(maxY, y);
                        }
                    }
                }

                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;

                setLatexPosition({ x: centerX, y: centerY });
                resp.data.forEach((data: Response) => {
                    setTimeout(() => {
                        setResult({
                            expression: data.expr,
                            answer: data.result
                        });
                    }, 1000);
                });
            } catch (error) {
                console.error("Calculation error:", error);
            } finally {
                setIsCalculating(false); // End loading animation
            }
        }
    };

    const toggleColorBar = () => {
        setIsColorBarVisible(!isColorBarVisible);
    };

    const handleColorSelect = (selectedColor: string) => {
        setColor(selectedColor);
        setIsColorBarVisible(false);
    };

    return (
        <>
            <div className='fixed top-4 left-0 right-0 z-30 px-4 md:px-6 lg:px-8'>
                <div className='max-w-3xl mx-auto flex gap-3 justify-center'>
                    <Button
                        onClick={() => setReset(true)}
                        className='flex-1 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-800 hover:to-rose-700 text-white border-0 rounded-lg shadow-lg transition-all duration-300 hover:shadow-rose-500/25 hover:-translate-y-0.5'
                        variant='default'
                        disabled={isCalculating}
                    >
                        Reset
                    </Button>
                    <Button
                        onClick={runRoute}
                        className='flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white border-0 rounded-lg shadow-lg transition-all duration-300 hover:shadow-emerald-500/25 hover:-translate-y-0.5'
                        variant='default'
                        disabled={isCalculating}
                    >
                        {isCalculating ? 'Calculating...' : 'Calculate'}
                    </Button>
                </div>
            </div>

            {/* AI Loading Animation */}
            {isCalculating && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="p-8 rounded-2xl bg-gray-900/90 border border-teal-500/30 shadow-lg shadow-teal-500/20 flex flex-col items-center">
                        <div className="relative w-20 h-20">
                            {/* Pulsating circle */}
                            <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping" style={{ animationDuration: '2s' }}></div>
                            
                            {/* Rotating ring */}
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 border-r-emerald-400 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                            
                            {/* Brain circuit icon */}
                            <BrainCircuit 
                                size={32} 
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/90 animate-pulse" 
                                style={{ animationDuration: '2.5s' }}
                            />
                        </div>
                        <p className="mt-4 text-white font-medium tracking-wider text-sm">
                            Processing your equation...
                        </p>
                        <div className="mt-3 flex space-x-1">
                            {[...Array(3)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" 
                                    style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
                                ></div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Color palette toggle button with animation */}
            <Button
                onClick={toggleColorBar}
                className="fixed left-4 bottom-6 md:left-6 md:bottom-8 z-30 p-2.5 rounded-full bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 shadow-lg border border-gray-700/50 transition-all duration-300 hover:scale-110 hover:shadow-lg"
                size="icon"
                variant="outline"
            >
                <Palette
                    size={24}
                    color={color}
                    className="animate-pulse"
                    style={{ animationDuration: '3s' }}
                />
            </Button>

            {/* Side color bar with animation */}
            {isColorBarVisible && (
                <div
                    className="fixed left-4 bottom-20 md:left-6 md:bottom-24 z-30 bg-gray-900/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-gray-700/50 animate-in slide-in-from-left duration-300"
                >
                    <div className="flex justify-end mb-2">
                        <Button
                            onClick={() => setIsColorBarVisible(false)}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-gray-800 transition-colors"
                        >
                            <X size={16} className="text-gray-400" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                        {SWATCHES.map((swatch) => (
                            <div
                                key={swatch}
                                className={`p-1 rounded-md transition-all duration-200 ${color === swatch ? 'bg-gray-700 scale-110' : 'hover:bg-gray-800'}`}
                            >
                                <ColorSwatch
                                    color={swatch}
                                    onClick={() => handleColorSelect(swatch)}
                                    className="cursor-pointer transition-transform hover:scale-110 shadow-sm"
                                    size={32}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <canvas
                ref={canvasRef}
                id='canvas'
                className='fixed top-0 left-0 w-full h-full bg-black touch-none'
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawingTouch}
                onTouchMove={drawTouch}
                onTouchEnd={stopDrawingTouch}
                onTouchCancel={stopDrawingTouch}
            />

            {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latexPosition}
                    onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                >
                    <div className="absolute p-3 rounded-lg bg-gray-900/80 backdrop-blur-md text-white border border-gray-700/50 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="latex-content cursor-move">{latex}</div>
                    </div>
                </Draggable>
            ))}
        </>
    );
}