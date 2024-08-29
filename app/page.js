"use client"; // クライアントコンポーネントとして指定

import { useState, useEffect, useRef } from "react";
import heic2any from "heic2any";

export default function Home() {
  const [images, setImages] = useState([]);
  const [positions, setPositions] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [displayedImages, setDisplayedImages] = useState([]);
  const intervalRef = useRef(null);

  // 画面の幅と高さを管理するref
  const widthRef = useRef(0);
  const heightRef = useRef(0);

  useEffect(() => {
    // 初期サイズの取得
    // widthRef.current = document.documentElement.clientWidth;
    // heightRef.current = document.documentElement.clientHeight;
    widthRef.current = 1920;
    heightRef.current = 1080;
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
        if (file.type === "image/heic") {
          try {
            const convertedBlob = await heic2any({
              blob: file,
              toType: "image/png",
            });
            setProgress(((index + 1) / imageFiles.length) * 50);
            return URL.createObjectURL(convertedBlob);
          } catch (error) {
            console.error("HEIC変換エラー:", error);
            return null;
          }
        } else {
          setProgress(((index + 1) / imageFiles.length) * 50);
          return URL.createObjectURL(file);
        }
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
      const initialDisplay = images.slice(0, 20);
      setDisplayedImages(initialDisplay);

      let currentIndex = 0;
      intervalRef.current = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * images.length);
        const newImage = images[randomIndex];

        setDisplayedImages((prevImages) => {
          const updatedImages = [...prevImages];
          updatedImages[currentIndex] = newImage;
          return updatedImages;
        });

        setPositions((prevPositions) => {
          const newPositions = [...prevPositions];
          newPositions[currentIndex] = {
            x: Math.random() * widthRef.current,
            y: Math.random() * heightRef.current,
            speed: 0.5 + Math.random() * 1,
          };
          return newPositions;
        });

        currentIndex = (currentIndex + 1) % 20;
      }, 2000);

      return () => clearInterval(intervalRef.current);
    }
  }, [images]);

  useEffect(() => {
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

      requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animate);
  }, [displayedImages]);

  return (
    <div>
      <h1>お絵かき水族館風のアニメーション（一匹ずつ入れ替え）</h1>
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
            }}
          />
        ))}
      </div>
    </div>
  );
}
