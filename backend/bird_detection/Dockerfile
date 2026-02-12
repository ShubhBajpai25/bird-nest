# Use AWS Lambda Python runtime
FROM public.ecr.aws/lambda/python:3.10

# Install system dependencies
RUN yum update -y && yum install -y \
    mesa-libGL \
    libXext \
    libSM \
    libXrender \
    gcc \
    gcc-c++ \
    make \
    && yum clean all

# Copy requirements
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# --- ARM64 CHANGE ---
# Just install standard torch. On ARM64 Linux, this is already CPU-only and optimized.
RUN pip install --no-cache-dir torch torchvision

# Install other requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy the code
COPY detect_birds.py lambda_handler.py ${LAMBDA_TASK_ROOT}/

# Set environment variables
ENV YOLO_CONFIG_DIR=/tmp
ENV PYTHONPATH=${LAMBDA_TASK_ROOT}

CMD ["lambda_handler.lambda_handler"]