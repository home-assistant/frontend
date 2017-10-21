from setuptools import setup, find_packages

setup(name='home-assistant-frontend',
      version='0.1',
      description='The Home Assistant frontend',
      url='https://github.com/home-assistant/home-assistant-polymer',
      author='Paulus Schoutsen',
      author_email='Paulus@PaulusSchoutsen.nl',
      license='Apache License 2.0',
      packages=find_packages(include=['hass_frontend', 'hass_frontend.*']),
      zip_safe=False)
