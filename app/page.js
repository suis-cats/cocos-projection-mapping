"use client"; // クライアントコンポーネントとして指定

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [images, setImages] = useState([]);
  const [positions, setPositions] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [displayedImages, setDisplayedImages] = useState([]);
  const [numDisplay, setNumDisplay] = useState(20); // 表示する枚数を管理する状態
  const intervalRef = useRef(null);
  const currentIndexRef = useRef(0); // 現在のインデックスをuseRefで管理

  // 画面の幅と高さを管理するref
  const widthRef = useRef(0);
  const heightRef = useRef(0);

  useEffect(() => {
    // 初期サイズの取得
    widthRef.current = document.documentElement.clientWidth;
    heightRef.current = document.documentElement.clientHeight;
  }, []);

  const handleFolderSelect = async (event) => {
    setLoading(true);
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(
      (file) => file.type.startsWith("image/") || file.type === "image/heic"
    );

    setProgress(0);

    const imageUrls = await Promise.all(
      imageFiles.map(async (file, index) => {
        setProgress(((index + 1) / imageFiles.length) * 50);
        return URL.createObjectURL(file);
      })
    );

    const validImageUrls = imageUrls.filter((url) => url !== null);
    const processedImages = await Promise.all(
      validImageUrls.map((url, index) =>
        makeImageTransparent(url).then((processedUrl) => {
          setProgress(50 + ((index + 1) / validImageUrls.length) * 50);
          return processedUrl;
        })
      )
    );

    const initialPositions = processedImages.map(() => ({
      x: Math.random() * widthRef.current,
      y: Math.random() * heightRef.current,
      speed: 0.5 + Math.random() * 1,
    }));

    setImages(processedImages);
    setPositions(initialPositions);
    setLoading(false);
  };

  const makeImageTransparent = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
      };
    });
  };

  useEffect(() => {
    if (images.length > 0) {
      const initialDisplay = images.slice(0, numDisplay);
      setDisplayedImages(initialDisplay);

      intervalRef.current = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * images.length);
        const newImage = images[randomIndex];

        setDisplayedImages((prevImages) => {
          const updatedImages = [...prevImages];
          updatedImages[currentIndexRef.current] = newImage;
          return updatedImages;
        });

        setPositions((prevPositions) => {
          const newPositions = [...prevPositions];
          newPositions[currentIndexRef.current] = {
            x: Math.random() * widthRef.current,
            y: Math.random() * heightRef.current,
            speed: 0.5 + Math.random() * 1,
          };
          return newPositions;
        });

        currentIndexRef.current = (currentIndexRef.current + 1) % numDisplay;
      }, 2000);

      return () => clearInterval(intervalRef.current);
    }
  }, [images, numDisplay]);

  useEffect(() => {
    let animationFrameId;

    const animate = () => {
      setPositions((prevPositions) =>
        prevPositions.map((pos) => {
          const newX = pos.x + (Math.random() - 0.5) * pos.speed * 5;
          const newY = pos.y + (Math.random() - 0.5) * pos.speed * 5;

          let adjustedX = newX;
          let adjustedY = newY;

          if (newX < 0 || newX > widthRef.current - 200) {
            adjustedX = newX < 0 ? 0 : widthRef.current - 200;
          }
          if (newY < 0 || newY > heightRef.current - 200) {
            adjustedY = newY < 0 ? 0 : heightRef.current - 200;
          }

          return {
            x: adjustedX,
            y: adjustedY,
            speed: pos.speed,
          };
        })
      );

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [displayedImages]);

  return (
    <div>
      <input
        type="file"
        webkitdirectory="true"
        mozdirectory="true"
        directory="true"
        multiple
        onChange={handleFolderSelect}
      />
      {loading && (
        <progress
          value={progress}
          max="100"
          style={{ width: "100%", height: "30px", marginTop: "10px" }}
        >
          {progress}%
        </progress>
      )}
      <div>
        {/* <label>
          表示数:
          <input
            type="number"
            value={numDisplay}
            onChange={(e) => setNumDisplay(parseInt(e.target.value, 10))}
            min="1"
            max="100"
          />
        </label> */}
      </div>
      <div
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {displayedImages.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`image-${index}`}
            style={{
              position: "absolute",
              width: "200px",
              height: "200px",
              objectFit: "cover",
              left: `${positions[index]?.x}px`,
              top: `${positions[index]?.y}px`,
              transition:
                "left 2s linear, top 2s linear, opacity 1s ease-in-out",
              opacity: 1,
              pointerEvents: "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
