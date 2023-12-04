const express = require("express");

const compressImages = require("compress-images");
const formidable = require("express-formidable");
const fs = require("fs");
const path = require("path");

const app = express();

const maxSize = 10 * 1024 * 1024; // 10 MB
app.use(formidable({ maxFileSize: maxSize }));

app.use(express.static(__dirname + "/public"));

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.use("/public", express.static(path.resolve()));

app.get("/", function (req, res) {
  const isCompressed = req.query.isCompressed === "true";
  const compressedImagePath = "public/" + req.query.compressedPath;
  const originalSize = req.query.originalSize;
  const compressedSize = req.query.compressedSize;
  const percent = req.query.percent;

  res.render("index", {
    isCompressed,
    compressedImagePath,
    originalSize,
    compressedSize,
    percent,
  });
});

app.post("/compress-image", function (req, res) {
  const image = req.files.image;
  if (image.size > 0) {
    // Ensure temp-uploads directory exists
    if (!fs.existsSync("/temp-uploads")) {
      fs.mkdirSync("/temp-uploads");
    }

    if (!fs.existsSync("/uploads")) {
      fs.mkdirSync("/uploads");
    }
    if (image.type == "image/png" || image.type == "image/jpeg") {
      fs.readFile(image.path, function (error, data) {
        if (error) throw error;

        const compressedFilePath = "uploads/";
        const compression = 60;

        const filePath = "/temp-uploads/" + new Date().getTime() + "-" + image.name;

        fs.writeFile(filePath, data, async function (error) {
          if (error) throw error;

          compressImages(
            filePath,
            compressedFilePath,
            { compress_force: false, statistic: true, autoupdate: true },
            false,
            { jpg: { engine: "mozjpeg", command: ["-quality", compression] } },
            {
              png: {
                engine: "pngquant",
                command: ["--quality=" + compression + "-" + compression, "-o"],
              },
            },
            { svg: { engine: "svgo", command: "--multipass" } },
            { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
            async function (error, completed, statistic) {
              console.log("-------------");
              console.log(error);
              console.log(completed);
              console.log(statistic);
              console.log("-------------");

              fs.unlink(filePath, function (error) {
                if (error) throw error;
              });
              res.redirect(
                `/?isCompressed=true&compressedPath=${statistic.path_out_new}&originalSize=${statistic.size_in}&compressedSize=${statistic.size_output}&percent=${statistic.percent}`
              );
            }
          );
        });

        fs.unlink(image.path, function (error) {
          if (error) throw error;
        });
      });
    } else {
      res.send("Please select an image");
    }
  } else {
    res.send("Please select an image");
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server running on port: http://localhost:${port}`));
