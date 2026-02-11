# Use AWS Lambda Python runtime
FROM public.ecr.aws/lambda/python:3.10

# 1. Install system dependencies (Keeping gcc/make just in case, but usually not needed if we avoid compilation)
RUN yum update -y && yum install -y \
    mesa-libGL \
    libXext \
    libSM \
    libXrender \
    gcc \
    gcc-c++ \
    make \
    && yum clean all

# 2. Copy requirements first
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# 3. CRITICAL OPTIMIZATION: Install CPU-only Torch first
# This prevents downloading the massive GPU version
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 4. Install the rest of the requirements
# We use --no-deps for ultralytics effectively because we manually installed torch above
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy the application code
COPY detect_birds.py ${LAMBDA_TASK_ROOT}/
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}/

# 6. Set environment variables
# YOLO needs a writable config dir in Lambda
ENV YOLO_CONFIG_DIR=/tmp
ENV PYTHONPATH=${LAMBDA_TASK_ROOT}

# Set the Lambda handler
CMD ["lambda_handler.lambda_handler"]