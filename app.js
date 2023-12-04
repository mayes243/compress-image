const express = require("express");

const compressImages = require("compress-images");
const formidable = require("express-formidable");
const fileSystem = require("fs");
const os = require("os");
const path = require("path");

const app = express();

const maxSize = 10 * 1024 * 1024; // 10 MB
app.use(formidable({ maxFileSize: maxSize }));

const tempDir = os.tmpdir();

app.use(express.static(__dirname + "/public"));

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.use("/public", express.static(path.join(__dirname)));

app.get("/", function (request, result) {
  const isCompressed = request.query.isCompressed === "true";
  const compressedImagePath = "public" + request.query.compressedPath;
  const originalSize = request.query.originalSize;
  const compressedSize = request.query.compressedSize;
  const percent = request.query.percent;

  result.render("index", {
    isCompressed,
    compressedImagePath,
    originalSize,
    compressedSize,
    percent,
  });
});

app.post("/compressImage", function (request, result) {
  const image = request.files.image;
  if (image.size > 0) {
    if (image.type == "image/png" || image.type == "image/jpeg") {
      fileSystem.readFile(image.path, function (error, data) {
        if (error) throw error;

        const compressedFilePath = os.tmpdir() + "/uploads/";
        const compression = 60;

        const filePath = tempDir + "/temp-uploads/" + new Date().getTime() + "-" + image.name;

        // Ensure temp-uploads directory exists
        if (!fileSystem.existsSync(tempDir + "/temp-uploads")) {
          fileSystem.mkdirSync(tempDir + "/temp-uploads");
        }

        if (!fileSystem.existsSync(tempDir + "/uploads")) {
          fileSystem.mkdirSync(tempDir + "/uploads");
        }

        fileSystem.writeFile(filePath, data, async function (error) {
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

              fileSystem.unlink(filePath, function (error) {
                if (error) throw error;
              });
              result.redirect(
                `/?isCompressed=true&compressedPath=${statistic.path_out_new}&originalSize=${statistic.size_in}&compressedSize=${statistic.size_output}&percent=${statistic.percent}`
              );
            }
          );
        });

        fileSystem.unlink(image.path, function (error) {
          if (error) throw error;
        });
      });
    } else {
      result.send("Please select an image");
    }
  } else {
    result.send("Please select an image");
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server running on port: http://localhost:${port}`));
