import React, { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { getPhotoComparison, saveAfterPhoto, clearSessionPhotos } from '../modules/photoModule';

const BeforeAfterComparison = ({ onClose, beforePhoto }) => {
  const [afterPhoto, setAfterPhoto] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setAfterPhoto(dataUrl);
      saveAfterPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSliderChange = (e) => {
    setSliderPosition(e.clientX - containerRef.current.getBoundingClientRect().left);
  };

  const sliderPercent = (sliderPosition / (containerRef.current?.offsetWidth || 1)) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Before & After</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close comparison"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {beforePhoto && afterPhoto ? (
          <div className="space-y-6">
            {/* Comparison Slider */}
            <div
              ref={containerRef}
              className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-col-resize group"
              onMouseMove={handleSliderChange}
              role="region"
              aria-label="Before and after photo comparison slider"
            >
              {/* After image (background) */}
              <img
                src={afterPhoto}
                alt="After"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Before image (overlay) */}
              <div
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ width: `${Math.min(sliderPercent, 100)}%` }}
              >
                <img
                  src={beforePhoto}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Slider handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                style={{ left: `${sliderPercent}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                    <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                    <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-bold">
                Before
              </div>
              <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-bold">
                After
              </div>
            </div>

            {/* Celebration Message */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <p className="text-lg font-bold text-green-700 mb-2">✨ You did it! ✨</p>
              <p className="text-gray-700">
                Look at the transformation! Your hard work is visible. Take a moment to feel proud of yourself.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => clearSessionPhotos()}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Retake After Photo
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                Done Celebrating!
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Before Photo Display */}
            {beforePhoto && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-600 uppercase">Before Photo</p>
                <img
                  src={beforePhoto}
                  alt="Before"
                  className="w-full aspect-square rounded-2xl object-cover border border-gray-200"
                />
              </div>
            )}

            {/* After Photo Capture */}
            <div className="space-y-4">
              <p className="text-gray-700 font-medium">
                Now take an "After" photo to see the transformation! 📸
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:from-indigo-400 hover:to-indigo-500 transition-all"
                >
                  <Camera className="w-6 h-6" />
                  Capture After Photo
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 text-gray-700 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Skip Comparison
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeforeAfterComparison;
