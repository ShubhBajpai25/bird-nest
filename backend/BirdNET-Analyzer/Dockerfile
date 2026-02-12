FROM public.ecr.aws/lambda/python:3.10

# 1. Install System Dependencies
RUN yum update -y && yum install -y \
    gcc gcc-c++ make libsndfile libsndfile-devel hdf5-devel pkgconfig wget tar xz git && \
    yum clean all

# 2. Install FFmpeg (Binary)
RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz && \
    tar xvf ffmpeg-release-arm64-static.tar.xz && \
    mv ffmpeg-*-arm64-static/ffmpeg /usr/bin/ffmpeg && \
    mv ffmpeg-*-arm64-static/ffprobe /usr/bin/ffprobe && \
    chmod +x /usr/bin/ffmpeg /usr/bin/ffprobe && \
    rm -rf ffmpeg-*

# 3. Python Setup
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install "setuptools<70.0.0" && \
    pip install --no-cache-dir -r requirements.txt

# 4. Copy Code & Model
COPY lambda_function.py ${LAMBDA_TASK_ROOT}/
# We copy the model files directly to a clean folder
COPY model/BirdNET_GLOBAL_6K_V2.4_Model/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite ${LAMBDA_TASK_ROOT}/model/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite
COPY model/BirdNET_GLOBAL_6K_V2.4_Labels.txt ${LAMBDA_TASK_ROOT}/model/BirdNET_GLOBAL_6K_V2.4_Labels.txt

# 5. Env Vars
ENV NUMBA_CACHE_DIR=/tmp \
    MODEL_PATH=${LAMBDA_TASK_ROOT}/model/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite \
    LABELS_FILE=${LAMBDA_TASK_ROOT}/model/BirdNET_GLOBAL_6K_V2.4_Labels.txt

CMD ["lambda_function.lambda_handler"]