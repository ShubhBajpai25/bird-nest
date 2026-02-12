FROM public.ecr.aws/lambda/python:3.10

# 1. Install System Dependencies
RUN yum update -y && yum install -y \
    gcc \
    gcc-c++ \
    make \
    libsndfile \
    libsndfile-devel \
    wget \
    tar \
    xz \
    git \
    && yum clean all

# 2. Install FFmpeg
RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz \
    && tar xvf ffmpeg-release-arm64-static.tar.xz \
    && mv ffmpeg-*-arm64-static/ffmpeg /usr/bin/ffmpeg \
    && mv ffmpeg-*-arm64-static/ffprobe /usr/bin/ffprobe \
    && chmod +x /usr/bin/ffmpeg /usr/bin/ffprobe \
    && rm -rf ffmpeg-*

# 3. Python Setup
COPY requirements.txt .

# SAFETY NET: Downgrade setuptools to prevent build errors for older packages
RUN pip install --upgrade pip
RUN pip install "setuptools<70.0.0"

# Install requirements
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy Code
COPY birdnet_analyzer ${LAMBDA_TASK_ROOT}/birdnet_analyzer
COPY lambda_function.py ${LAMBDA_TASK_ROOT}/
COPY model ${LAMBDA_TASK_ROOT}/model

# 5. Env Vars
ENV NUMBA_CACHE_DIR=/tmp
ENV MPLCONFIGDIR=/tmp
ENV MODEL_PATH=${LAMBDA_TASK_ROOT}/model/BirdNET_GLOBAL_6K_V2.4_Model_FP16.tflite \
    MDATA_MODEL_PATH=${LAMBDA_TASK_ROOT}/model/BirdNET_GLOBAL_6K_V2.4_MData_Model_V2_FP16.tflite \
    LABELS_FILE=${LAMBDA_TASK_ROOT}/model/BirdNET_GLOBAL_6K_V2.4_Labels.txt

CMD ["lambda_function.lambda_handler"]