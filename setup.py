from setuptools import setup, find_packages

setup(name='home-assistant-frontend',
      version='20171106.0',
      description='The Home Assistant frontend',
      url='https://github.com/home-assistant/home-assistant-polymer',
      author='Paulus Schoutsen',
      author_email='Paulus@PaulusSchoutsen.nl',
      license='Apache License 2.0',
      packages=find_packages(include=['hass_frontend', 'hass_frontend.*']),
      include_package_data=True,
      zip_safe=False)
